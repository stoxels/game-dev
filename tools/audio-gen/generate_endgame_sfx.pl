#!/usr/bin/env perl
# ============================================================
#  generate_endgame_sfx.pl
#  Renders the full endgame sound-effect catalog for
#  Freebuff/Stoxels as .wav files, entirely from code.
#
#  Outputs (all mono 44.1 kHz 16-bit, into audio/sfx/endgame/):
#    menus  : vendor_buy, vendor_sell, loot_filter_save, craft_apply
#    items  : mana_pickup, currency_pickup, essence_pickup, map_pickup,
#             item_claim_unique, loot_explosion, level_up
#    combat : player_block, player_parry, player_deflect, monster_kill,
#             monster_swing, monster_shoot, hazard_spawn, ailment_apply,
#             boss_phase_shift
#
#  Run:  perl tools/audio-gen/generate_endgame_sfx.pl
#
#  Per-sample synthesis: additive oscillators, filtered white noise,
#  ADSR envelopes, glides and filter sweeps. Each sound is a small
#  function of layer calls — tweak and re-run to re-roll.
# ============================================================
use strict;
use warnings;
use File::Basename;
use File::Spec;

use constant SR => 44100;
use constant TAU => 6.283185307179586;

my $ROOT = File::Spec->rel2abs(File::Spec->catdir(dirname($0), '..', '..'));
my $OUT  = File::Spec->catdir($ROOT, 'audio', 'sfx', 'endgame');

# Deterministic renders: the same script run always produces the same files,
# so tweaking one sound never silently re-rolls the noise in the others.
srand(20260903);

sub mtof { my ($m) = @_; return 440 * 2 ** (($m - 69) / 12); }

my @NOISE = map { rand() * 2 - 1 } 1 .. SR;

my %SHAPES = (
    sine => [[1, 1]],
    tri  => [[1, 1], [3, -1 / 9], [5, 1 / 25]],
    sq   => [[1, 1], [3, 1 / 3],  [5, 1 / 5]],
    saw  => [[1, 1], [2, 1 / 2],  [3, 1 / 3], [4, 1 / 4]],
);

sub _env {
    my ($tt, $dur, $att, $rel) = @_;
    return 0 if $tt >= $dur;
    if ($tt < $att)  { return $att > 0 ? $tt / $att : 1; }
    if ($tt > $dur - $rel) { my $x = $dur - $tt; return $rel > 0 && $x > 0 ? $x / $rel : 0; }
    return 1;
}

# _emit($t0,$dur,$f0,$f1,$shape,$vol,$att,$rel,$cf0,$cf1,$tau) -> mixes into $M
sub _emit {
    my ($M, $t0, $dur, $f0, $f1, $shape, $vol, $att, $rel, $cf0, $cf1, $tau) = @_;
    my $i0 = int($t0 * SR);
    my $n  = int($dur * SR);
    return if $n <= 0;
    my $co = $SHAPES{$shape} || $SHAPES{sine};
    $cf1 = $cf0 if !defined $cf1;
    my $ph = 0; my $y = 0; my $hasf = defined $cf0 && $cf0 > 0;
    for (my $i = 0; $i < $n; $i++) {
        my $idx = $i0 + $i;
        my $tt  = $i / SR;
        my $fr  = $f0 + ($f1 - $f0) * ($tt / $dur);
        $fr = 20 if $fr < 20;
        $ph += TAU * $fr / SR;
        $ph -= TAU * 2 if $ph > TAU * 2;
        my $v = 0;
        for my $c (@$co) { $v += $c->[1] * sin($c->[0] * $ph); }
        if ($hasf) {
            my $fc = $cf0 + ($cf1 - $cf0) * ($tt / $dur);
            $fc = 20 if $fc < 20;
            my $a = 1 - exp(-TAU * $fc / SR);
            $y += $a * ($v - $y);
            $v = $y;
        }
        my $e = _env($tt, $dur, $att, $rel);
        $e *= exp(-$tt / $tau) if $tau;
        $M->[$idx] += $v * $e * $vol;
    }
}

# noise_burst($t0,$dur,$vol,$att,$rel,$ops,$tau)  ops: [ [lp|hp, f0, (f1)], ... ]
sub noise_burst {
    my ($M, $t0, $dur, $vol, $att, $rel, $ops, $tau) = @_;
    my $i0 = int($t0 * SR);
    my $n  = int($dur * SR);
    return if $n <= 0;
    my @st = (0) x scalar(@$ops);
    for (my $i = 0; $i < $n; $i++) {
        my $idx = $i0 + $i;
        my $tt  = $i / SR;
        my $x   = $NOISE[$idx % SR];
        my $oi  = 0;
        for my $op (@$ops) {
            my ($type, $f0, $f1) = @$op;
            my $fr = defined $f1 ? $f0 + ($f1 - $f0) * ($tt / $dur) : $f0;
            $fr = 20 if $fr < 20;
            my $a = 1 - exp(-TAU * $fr / SR);
            if ($type eq 'lp') {
                $st[$oi] += $a * ($x - $st[$oi]);
                $x = $st[$oi];
            } else {
                my $lp = $st[$oi] + $a * ($x - $st[$oi]);
                $x = $x - $lp;
                $st[$oi] = $lp;
            }
            $oi++;
        }
        my $e = _env($tt, $dur, $att, $rel);
        $e *= exp(-$tt / $tau) if $tau;
        $M->[$idx] += $x * $e * $vol;
    }
}

sub write_wav {
    my ($name, $chans, $sr, $dur) = @_;
    my $n  = scalar @{ $chans->[0] };
    my $ch = scalar @$chans;
    my $data = '';
    for (my $i = 0; $i < $n; $i++) {
        for my $c (@$chans) {
            my $f = $c->[$i];
            $f = 0.999 if $f > 0.999; $f = -0.999 if $f < -0.999;
            $data .= pack('s<', int($f * 32767));
        }
    }
    my $path = File::Spec->catfile($OUT, "sfx_$name.wav");
    my $byteRate = $sr * $ch * 2;
    my $blockAlign = $ch * 2;
    my $hdr = 'RIFF' . pack('V', 36 + length($data)) . 'WAVE' .
        'fmt ' . pack('VvvVVvv', 16, 1, $ch, $sr, $byteRate, $blockAlign, 16) .
        'data' . pack('V', length($data));
    open(my $fh, '>:raw', $path) or die "cannot write $path: $!";
    print $fh $hdr, $data;
    close($fh);
    printf "  %-26s %5.2f s  %6.1f KB\n", "sfx_$name.wav", $n / $sr, length($data) / 1024;
}

sub bake {
    my ($name, $dur) = @_;
    my $n = int($dur * SR);
    my @M = (0) x $n;
    return \@M;
}

sub finish {
    my ($name, $dur, $Mr, $gain) = @_;
    $gain = 1 unless defined $gain;
    # Remove any DC bias (asymmetric layers can lean the waveform off zero,
    # which some speakers/headphones translate into an audible thump).
    my $sum = 0;
    $sum += $_ for @$Mr;
    my $mean = $sum / scalar(@$Mr);
    for my $i (0 .. $#$Mr) { $Mr->[$i] -= $mean; }
    # Normalise to a consistent peak so in-game volumes behave uniformly.
    my $peak = 0;
    for my $v (@$Mr) { my $a = abs($v); $peak = $a if $a > $peak; }
    if ($peak > 0) {
        my $s = 0.9 / $peak;
        for my $i (0 .. $#$Mr) { $Mr->[$i] *= $s; }
    }
    # Optional per-file trim AFTER normalisation (only ever attenuates).
    if ($gain != 1) {
        for my $i (0 .. $#$Mr) { $Mr->[$i] *= $gain; }
    }
    write_wav($name, [$Mr], SR, $dur);
}

# ============================================================
# MENUS & SYSTEMS
# ============================================================

sub sfx_vendor_buy {
    my $M = bake('vendor_buy', 0.5);
    _emit($M, 0.00, 0.14, 1568, 1108, 'tri', 0.14, 0.002, 0.05, undef, undef, 0.06);
    noise_burst($M, 0.00, 0.03, 0.10, 0.001, 0.02, [['hp', 6500]], undef);
    _emit($M, 0.14, 0.18, 1245, 880, 'tri', 0.12, 0.002, 0.06, undef, undef, 0.08);
    noise_burst($M, 0.14, 0.03, 0.09, 0.001, 0.02, [['hp', 6500]], undef);
    _emit($M, 0.28, 0.2, 140, 85, 'sine', 0.28, 0.002, 0.06, undef, undef, 0.08);
    finish('vendor_buy', 0.5, $M);
}

sub sfx_vendor_sell {
    my $M = bake('vendor_sell', 0.62);
    for my $i (0 .. 3) {
        my $t = $i * 0.09;
        my $f = 880 * 2 ** ($i * 0.42);   # 880 → 2093
        _emit($M, $t, 0.18, $f, $f * 0.9, 'tri', 0.13, 0.002, 0.06, undef, undef, 0.10);
        noise_burst($M, $t, 0.03, 0.08, 0.001, 0.02, [['hp', 7000]], undef);
    }
    _emit($M, 0.42, 0.2, 2637, 2637, 'tri', 0.07, 0.004, 0.1, undef, undef, 0.12);
    finish('vendor_sell', 0.62, $M);
}

sub sfx_loot_filter_save {
    my $M = bake('loot_filter_save', 0.42);
    _emit($M, 0.00, 0.09, 420, 340, 'sq', 0.14, 0.002, 0.04, 2400, 1200, undef);
    noise_burst($M, 0.00, 0.04, 0.08, 0.001, 0.02, [['hp', 2000]], undef);
    _emit($M, 0.13, 0.1, 660, 620, 'sq', 0.12, 0.002, 0.04, 3000, 1500, undef);
    _emit($M, 0.24, 0.18, 230, 140, 'sine', 0.20, 0.003, 0.06, undef, undef, 0.08);
    finish('loot_filter_save', 0.42, $M, 0.63);   # trimmed: was the loudest file in the pack
}

sub sfx_craft_apply {
    my $M = bake('craft_apply', 0.95);
    _emit($M, 0.00, 0.28, 320, 1600, 'sq', 0.16, 0.004, 0.08, 600, 3800, 0.10);
    _emit($M, 0.02, 0.26, 160, 800, 'saw', 0.10, 0.004, 0.08, 400, 2500, 0.10);
    _emit($M, 0.28, 0.45, 130, 65, 'sine', 0.34, 0.003, 0.10, undef, undef, 0.10);
    my $arp = [988, 1245, 1568, 1976];
    for my $i (0 .. $#$arp) {
        _emit($M, 0.30 + $i * 0.05, 0.3, $arp->[$i], $arp->[$i], 'tri', 0.10, 0.004, 0.12, undef, undef, 0.14);
    }
    _emit($M, 0.52, 0.4, 2637, 2637, 'sine', 0.06, 0.004, 0.2, undef, undef, 0.2);
    finish('craft_apply', 0.95, $M);
}

# ============================================================
# ITEMS & LOOT
# ============================================================

sub sfx_mana_pickup {
    my $M = bake('mana_pickup', 0.75);
    _emit($M, 0.00, 0.16, 880, 880,  'sine', 0.14, 0.004, 0.06, undef, undef, 0.07);
    _emit($M, 0.12, 0.2, 1175, 1175, 'sine', 0.13, 0.004, 0.08, undef, undef, 0.09);
    noise_burst($M, 0.14, 0.07, 0.10, 0.002, 0.04, [['hp', 3200]], 0.05);
    _emit($M, 0.24, 0.45, 1760, 1865, 'sine', 0.08, 0.005, 0.2, undef, undef, 0.16);
    _emit($M, 0.34, 0.35, 1320, 1320, 'sine', 0.06, 0.02, 0.15, undef, undef, 0.2);
    finish('mana_pickup', 0.75, $M);
}

sub sfx_currency_pickup {
    my $M = bake('currency_pickup', 0.85);
    _emit($M, 0.00, 0.6, 523, 494, 'sine', 0.12, 0.02, 0.15, undef, undef, 0.3);
    my $arp = [1046, 1318, 1568, 2093];
    for my $i (0 .. $#$arp) {
        _emit($M, 0.04 + $i * 0.06, 0.26, $arp->[$i], $arp->[$i], 'tri', 0.08, 0.004, 0.1, undef, undef, 0.12);
    }
    noise_burst($M, 0.04, 0.3, 0.05, 0.03, 0.12, [['hp', 6000]], 0.12);
    _emit($M, 0.46, 0.3, 2637, 2637, 'sine', 0.06, 0.004, 0.12, undef, undef, 0.14);
    finish('currency_pickup', 0.85, $M);
}

sub sfx_essence_pickup {
    my $M = bake('essence_pickup', 0.9);
    _emit($M, 0.00, 0.5, 2093, 2489, 'sine', 0.11, 0.003, 0.18, undef, undef, 0.12);
    _emit($M, 0.10, 0.5, 1865, 2217, 'sine', 0.09, 0.003, 0.18, undef, undef, 0.13);
    _emit($M, 0.22, 0.45, 2794, 2794, 'sine', 0.07, 0.01, 0.2, undef, undef, 0.15);
    noise_burst($M, 0.02, 0.25, 0.07, 0.01, 0.12, [['hp', 4200]], 0.1);
    finish('essence_pickup', 0.9, $M);
}

sub sfx_map_pickup {
    my $M = bake('map_pickup', 0.62);
    noise_burst($M, 0.00, 0.28, 0.18, 0.01, 0.1, [['lp', 1400, 300]], 0.09);
    noise_burst($M, 0.02, 0.06, 0.10, 0.001, 0.03, [['hp', 2600]], undef);
    _emit($M, 0.20, 0.28, 660, 880, 'tri', 0.12, 0.004, 0.1, undef, undef, 0.12);
    _emit($M, 0.20, 0.3, 220, 160, 'sine', 0.20, 0.004, 0.1, undef, undef, 0.09);
    finish('map_pickup', 0.62, $M);
}

sub sfx_item_claim_unique {
    my $M = bake('item_claim_unique', 1.15);
    my $motif = [783, 988, 1245];
    for my $i (0 .. $#$motif) {
        my $t = 0.10 + $i * 0.12;
        _emit($M, $t, 0.4, $motif->[$i], $motif->[$i], 'tri', 0.15, 0.004, 0.15, undef, undef, 0.14);
    }
    my $arp = [1568, 2093, 2637, 3136];
    for my $i (0 .. $#$arp) {
        _emit($M, 0.50 + $i * 0.05, 0.4, $arp->[$i], $arp->[$i], 'tri', 0.08, 0.004, 0.15, undef, undef, 0.12);
    }
    noise_burst($M, 0.48, 0.5, 0.05, 0.02, 0.2, [['hp', 7000]], 0.2);
    _emit($M, 0.00, 0.8, 196, 196, 'sine', 0.10, 0.1, 0.2, undef, undef, 0.3);
    _emit($M, 0.76, 0.35, 2093, 2093, 'sine', 0.07, 0.004, 0.15, undef, undef, 0.15);
    finish('item_claim_unique', 1.15, $M);
}

sub sfx_loot_explosion {
    my $M = bake('loot_explosion', 1.8);
    _emit($M, 0.00, 1.1, 70, 26, 'sine', 0.60, 0.002, 0.25, undef, undef, 0.28);
    noise_burst($M, 0.00, 1.2, 0.45, 0.002, 0.2, [['lp', 3600, 120]], 0.3);
    noise_burst($M, 0.02, 0.5, 0.10, 0.002, 0.2, [['hp', 2000]], 0.1);
    my @debris = ([0.05, 1400], [0.15, 1100], [0.26, 900], [0.38, 700], [0.50, 500]);
    for my $d (@debris) {
        my ($t, $f) = @$d;
        _emit($M, $t, 0.16, $f, $f * 0.85, 'tri', 0.11, 0.002, 0.08, undef, undef, 0.09);
        noise_burst($M, $t, 0.04, 0.06, 0.001, 0.03, [['hp', 5000]], 0.04);
    }
    _emit($M, 0.66, 0.5, 1760, 1760, 'tri', 0.05, 0.01, 0.2, undef, undef, 0.2);
    finish('loot_explosion', 1.8, $M);
}

sub sfx_level_up {
    my $M = bake('level_up', 0.95);
    my $arp = [523, 659, 784, 1046];
    for my $i (0 .. $#$arp) {
        my $vol = $i == $#$arp ? 0.15 : 0.13;
        _emit($M, 0.05 + $i * 0.09, 0.4, $arp->[$i], $arp->[$i], 'tri', $vol, 0.004, 0.15, undef, undef, 0.14);
    }
    _emit($M, 0.41, 0.5, 1046, 1046, 'sine', 0.10, 0.01, 0.2, undef, undef, 0.25);
    _emit($M, 0.00, 0.9, 262, 262, 'sine', 0.07, 0.08, 0.25, undef, undef, 0.3);
    noise_burst($M, 0.42, 0.4, 0.04, 0.02, 0.2, [['hp', 7000]], 0.2);
    finish('level_up', 0.95, $M);
}

# ============================================================
# COMBAT
# ============================================================

sub sfx_player_block {
    my $M = bake('player_block', 0.35);
    _emit($M, 0.00, 0.24, 150, 70, 'sine', 0.40, 0.002, 0.06, undef, undef, 0.07);
    noise_burst($M, 0.00, 0.2, 0.28, 0.002, 0.08, [['lp', 800, 220]], 0.06);
    noise_burst($M, 0.00, 0.04, 0.12, 0.001, 0.02, [['hp', 1600]], undef);
    finish('player_block', 0.35, $M);
}

sub sfx_player_parry {
    my $M = bake('player_parry', 0.40);
    _emit($M, 0.00, 0.34, 2600, 2600, 'sine', 0.14, 0.002, 0.14, undef, undef, 0.06);
    _emit($M, 0.00, 0.26, 4400, 4400, 'sine', 0.05, 0.002, 0.12, undef, undef, 0.05);
    _emit($M, 0.00, 0.34, 700, 480, 'tri', 0.34, 0.002, 0.14, undef, undef, 0.07);
    noise_burst($M, 0.00, 0.09, 0.18, 0.001, 0.04, [['hp', 5200]], 0.04);
    finish('player_parry', 0.40, $M);
}

sub sfx_player_deflect {
    my $M = bake('player_deflect', 0.7);
    my @tings = ([0, 2800], [0.16, 3500]);
    for my $tg (@tings) {
        my ($t, $f) = @$tg;
        _emit($M, $t, 0.3, $f, $f, 'sine', 0.13, 0.002, 0.12, undef, undef, 0.06);
        noise_burst($M, $t, 0.04, 0.06, 0.001, 0.03, [['hp', 5500]], 0.04);
    }
    noise_burst($M, 0.02, 0.3, 0.10, 0.02, 0.12, [['hp', 3000, 5000]], 0.1);
    _emit($M, 0.38, 0.3, 5200, 5200, 'sine', 0.05, 0.002, 0.12, undef, undef, 0.05);
    finish('player_deflect', 0.7, $M);
}

sub sfx_monster_kill {
    my $M = bake('monster_kill', 0.4);
    noise_burst($M, 0.00, 0.16, 0.22, 0.002, 0.06, [['lp', 700, 150]], 0.06);
    _emit($M, 0.00, 0.24, 260, 90, 'tri', 0.30, 0.002, 0.08, undef, undef, 0.07);
    noise_burst($M, 0.00, 0.06, 0.10, 0.001, 0.03, [['hp', 1100]], 0.04);
    finish('monster_kill', 0.4, $M);
}

sub sfx_monster_swing {
    my $M = bake('monster_swing', 0.3);
    noise_burst($M, 0.00, 0.26, 0.22, 0.06, 0.12, [['lp', 250, 1400]], 0.07);
    _emit($M, 0.05, 0.2, 95, 150, 'saw', 0.05, 0.02, 0.1, 200, 700, 0.08);
    finish('monster_swing', 0.3, $M);
}

sub sfx_monster_shoot {
    my $M = bake('monster_shoot', 0.28);
    noise_burst($M, 0.00, 0.12, 0.26, 0.001, 0.06, [['hp', 1600]], 0.04);
    _emit($M, 0.00, 0.22, 720, 240, 'sine', 0.34, 0.002, 0.08, undef, undef, 0.05);
    _emit($M, 0.04, 0.16, 2400, 2400, 'sine', 0.12, 0.002, 0.08, undef, undef, 0.04);
    finish('monster_shoot', 0.28, $M);
}

sub sfx_hazard_spawn {
    my $M = bake('hazard_spawn', 0.75);
    _emit($M, 0.00, 0.14, 700, 700, 'sq', 0.13, 0.002, 0.06, 2600, 2600, undef);
    _emit($M, 0.16, 0.16, 940, 940, 'sq', 0.13, 0.002, 0.06, 3000, 3000, undef);
    _emit($M, 0.00, 0.6, 120, 66, 'saw', 0.12, 0.01, 0.15, 500, 120, 0.2);
    noise_burst($M, 0.12, 0.3, 0.06, 0.02, 0.12, [['hp', 2500, 4000]], 0.1);
    finish('hazard_spawn', 0.75, $M);
}

sub sfx_ailment_apply {
    my $M = bake('ailment_apply', 0.5);
    noise_burst($M, 0.00, 0.14, 0.16, 0.001, 0.06, [['hp', 3500]], 0.05);
    _emit($M, 0.00, 0.28, 300, 90, 'saw', 0.16, 0.002, 0.1, 1100, 200, 0.09);
    noise_burst($M, 0.20, 0.1, 0.12, 0.001, 0.05, [['hp', 2600]], 0.05);
    _emit($M, 0.18, 0.24, 180, 90, 'sine', 0.16, 0.002, 0.1, undef, undef, 0.08);
    finish('ailment_apply', 0.5, $M);
}

# ── Elemental ailment variants (chosen per key by _egAilmentSfxKey) ──

sub sfx_ailment_fire {
    my $M = bake('ailment_fire', 0.6);
    noise_burst($M, 0.00, 0.5, 0.26, 0.01, 0.15, [['lp', 900, 240]], 0.09);
    noise_burst($M, 0.05, 0.06, 0.12, 0.001, 0.03, [['hp', 3200]], 0.04);
    noise_burst($M, 0.16, 0.07, 0.11, 0.001, 0.03, [['hp', 2800]], 0.04);
    _emit($M, 0.00, 0.55, 220, 330, 'saw', 0.06, 0.02, 0.15, 500, 900, 0.15);
    finish('ailment_fire', 0.6, $M);
}

sub sfx_ailment_cold {
    my $M = bake('ailment_cold', 0.7);
    _emit($M, 0.00, 0.35, 2400, 1400, 'sine', 0.10, 0.003, 0.15, undef, undef, 0.08);
    _emit($M, 0.04, 0.4, 3200, 1900, 'sine', 0.07, 0.003, 0.18, undef, undef, 0.09);
    _emit($M, 0.16, 0.3, 1568, 1568, 'tri', 0.09, 0.003, 0.12, undef, undef, 0.10);
    noise_burst($M, 0.00, 0.16, 0.08, 0.01, 0.08, [['hp', 6500]], 0.07);
    finish('ailment_cold', 0.7, $M);
}

sub sfx_ailment_lightning {
    my $M = bake('ailment_lightning', 0.5);
    noise_burst($M, 0.00, 0.10, 0.36, 0.001, 0.05, [['hp', 2200]], 0.04);
    noise_burst($M, 0.05, 0.07, 0.18, 0.001, 0.04, [['hp', 3500]], 0.03);
    noise_burst($M, 0.20, 0.07, 0.16, 0.001, 0.04, [['hp', 3000]], 0.03);
    noise_burst($M, 0.34, 0.06, 0.12, 0.001, 0.03, [['hp', 4000]], 0.02);
    # sustained zap: slower decay + wider filter sweep so the electric body
    # carries past the attack (was ~7 dB quieter than the sibling drones)
    _emit($M, 0.00, 0.42, 900, 130, 'saw', 0.42, 0.001, 0.12, 3200, 700, 0.16);
    _emit($M, 0.00, 0.26, 110, 48, 'sine', 0.26, 0.001, 0.07, undef, undef, 0.05);
    # thunder rumble in a usable band (500→180 Hz, not 320→95): the old 95 Hz
    # one-pole passed <0.5% of noise power and was effectively inaudible
    noise_burst($M, 0.03, 0.46, 0.32, 0.03, 0.24, [['lp', 500, 180]], 0.18);
    _emit($M, 0.06, 0.44, 62, 40, 'sine', 0.20, 0.04, 0.20, undef, undef, 0.16);
    finish('ailment_lightning', 0.5, $M);
}

sub sfx_ailment_shadow {
    my $M = bake('ailment_shadow', 0.75);
    _emit($M, 0.00, 0.55, 130, 90, 'saw', 0.14, 0.02, 0.2, 700, 140, 0.18);
    _emit($M, 0.03, 0.55, 123, 85, 'saw', 0.12, 0.02, 0.2, 600, 120, 0.18);
    noise_burst($M, 0.00, 0.4, 0.06, 0.03, 0.15, [['hp', 3200]], 0.12);
    _emit($M, 0.10, 0.35, 260, 55, 'sine', 0.16, 0.004, 0.12, undef, undef, 0.10);
    finish('ailment_shadow', 0.75, $M);
}

sub sfx_ailment_arcane {
    my $M = bake('ailment_arcane', 0.9);
    _emit($M, 0.00, 0.6, 880, 880, 'sine', 0.09, 0.01, 0.2, undef, undef, 0.2);
    _emit($M, 0.00, 0.6, 934, 934, 'sine', 0.09, 0.01, 0.2, undef, undef, 0.2);   # beating detune
    _emit($M, 0.08, 0.5, 660, 1320, 'tri', 0.10, 0.01, 0.2, undef, undef, 0.18);
    noise_burst($M, 0.10, 0.4, 0.05, 0.03, 0.15, [['hp', 5500]], 0.15);
    _emit($M, 0.50, 0.35, 1318, 1318, 'sine', 0.07, 0.004, 0.15, undef, undef, 0.14);
    finish('ailment_arcane', 0.9, $M);
}

# Subtle per-second DoT tick — makes an active ignite / shadowburn drain on
# the player readable by ear without ever drowning out combat hits.
sub sfx_ailment_dot_tick {
    my $M = bake('ailment_dot_tick', 0.16);
    _emit($M, 0.000, 0.13, 760, 470, 'sine', 0.30, 0.001, 0.11, undef, undef, 0.035);
    _emit($M, 0.005, 0.07, 1750, 1300, 'tri', 0.09, 0.001, 0.05, undef, undef, 0.020);
    noise_burst($M, 0.000, 0.035, 0.06, 0.001, 0.025, [['hp', 4000]], 0.012);
    finish('ailment_dot_tick', 0.16, $M, 0.5);   # trimmed ~6 dB: it repeats every second
}

# Element-flavoured DoT tick variants (selected by which status is draining):
# ignite = tiny ember crackles, shadowburn = damped dark pulse. All subtle.
sub sfx_ailment_dot_tick_fire {
    my $M = bake('ailment_dot_tick_fire', 0.26);
    noise_burst($M, 0.00, 0.03, 0.10, 0.001, 0.020, [['hp', 3800]], 0.010);
    noise_burst($M, 0.07, 0.03, 0.07, 0.001, 0.020, [['hp', 3000]], 0.010);
    noise_burst($M, 0.13, 0.02, 0.05, 0.001, 0.015, [['hp', 4600]], 0.008);
    noise_burst($M, 0.00, 0.22, 0.07, 0.010, 0.100, [['lp', 1400, 300]], 0.080);
    _emit($M, 0.00, 0.20, 170, 90, 'sine', 0.08, 0.005, 0.08, undef, undef, 0.060);
    finish('ailment_dot_tick_fire', 0.26, $M, 0.5);
}

sub sfx_ailment_dot_tick_shadow {
    my $M = bake('ailment_dot_tick_shadow', 0.22);
    _emit($M, 0.00, 0.20, 95, 38, 'sine', 0.26, 0.001, 0.07, undef, undef, 0.045);
    noise_burst($M, 0.00, 0.12, 0.05, 0.004, 0.06, [['lp', 700, 120]], 0.05);
    _emit($M, 0.00, 0.10, 220, 130, 'tri', 0.05, 0.001, 0.05, undef, undef, 0.03);
    finish('ailment_dot_tick_shadow', 0.22, $M, 0.5);
}

sub sfx_ailment_dot_tick_monster {
    # Dry mid 'thock' — hollow knock + woody click, so monster drain reads
    # as a creature taking damage, distinct from the player's ember-crackle
    # (bright noise) and dark-pulse (sub) ticks.
    my $M = bake('ailment_dot_tick_monster', 0.18);
    noise_burst($M, 0.00, 0.02, 0.10, 0.001, 0.015, [['hp', 1600]], undef);
    _emit($M, 0.00, 0.15, 430, 210, 'sine', 0.28, 0.001, 0.08, undef, undef, 0.035);
    _emit($M, 0.002, 0.10, 640, 380, 'tri', 0.07, 0.001, 0.06, undef, undef, 0.030);
    finish('ailment_dot_tick_monster', 0.18, $M, 0.5);
}

sub sfx_ground_fire_tick {
    # Hot sizzle-pop while standing in burning ground — the hazard burn's own
    # per-second cadence, distinct from the ignite ember-crackle (status DoT)
    # so 'standing in fire' reads differently from 'ignited'.
    my $M = bake('ground_fire_tick', 0.22);
    noise_burst($M, 0.00, 0.12, 0.16, 0.001, 0.06, [['hp', 2400, 4200]], 0.03);
    _emit($M, 0.00, 0.18, 200, 90, 'sine', 0.20, 0.001, 0.07, undef, undef, 0.03);
    noise_burst($M, 0.00, 0.05, 0.10, 0.001, 0.03, [['hp', 5200]], undef);
    _emit($M, 0.05, 0.12, 660, 380, 'tri', 0.06, 0.001, 0.05, undef, undef, 0.03);
    finish('ground_fire_tick', 0.22, $M, 0.5);
}

sub sfx_ailment_dot_end {
    # Soft 'all clear' — a gentle swelling G4→D5 fifth that resolves upward
    # into a faint G5→C6 glint as the last DoT expires. Slow attack, no sting,
    # no click; deliberately quiet like the tick family.
    my $M = bake('ailment_dot_end', 0.62);
    _emit($M, 0.00, 0.58, 392, 392, 'sine', 0.16, 0.12, 0.18, undef, undef, 0.12);
    _emit($M, 0.06, 0.52, 587, 587, 'sine', 0.10, 0.14, 0.16, undef, undef, 0.12);
    _emit($M, 0.22, 0.38, 784, 1046, 'sine', 0.05, 0.10, 0.14, undef, undef, 0.10);
    finish('ailment_dot_end', 0.62, $M, 0.5);
}

# Per-mechanic telegraph tones (the generic double-blip stays for other
# mechanics): corruption = low growl, bomb = ticking, frost = high shimmer.
# ── Puzzle corruption stings (grid effects) ────────────────────────────
# Short, percussive per-element hits for when a monster corrupts the puzzle
# grid itself — deliberately distinct from the longer sustained ailment_*
# tones that mark ignite/chill/shock/shadow status ailments.

sub sfx_puzzle_fire {   # lava scorches the grid — crack + hot thump
    my $M = bake('puzzle_fire', 0.34);
    noise_burst($M, 0.00, 0.05, 0.30, 0.001, 0.03, [['hp', 2400]], undef);
    _emit($M, 0.00, 0.30, 180, 65, 'sine', 0.55, 0.001, 0.06, undef, undef, 0.055);
    noise_burst($M, 0.02, 0.18, 0.14, 0.002, 0.08, [['lp', 3200, 500]], 0.05);
    _emit($M, 0.06, 0.14, 1100, 500, 'tri', 0.10, 0.001, 0.05, undef, undef, 0.04);
    finish('puzzle_fire', 0.34, $M);
}

sub sfx_puzzle_cold {   # ice creeps across cells — shatter pings + frost thud
    my $M = bake('puzzle_cold', 0.36);
    noise_burst($M, 0.00, 0.06, 0.16, 0.001, 0.03, [['hp', 5500]], 0.02);
    _emit($M, 0.00, 0.10, 2800, 2800, 'sine', 0.12, 0.001, 0.06, undef, undef, 0.03);
    _emit($M, 0.07, 0.12, 3400, 3400, 'sine', 0.09, 0.001, 0.07, undef, undef, 0.03);
    _emit($M, 0.00, 0.28, 620, 150, 'sine', 0.26, 0.001, 0.05, undef, undef, 0.05);
    finish('puzzle_cold', 0.36, $M);
}

sub sfx_puzzle_lightning {   # shocked cursor — single tight snap
    my $M = bake('puzzle_lightning', 0.3);
    noise_burst($M, 0.00, 0.05, 0.34, 0.001, 0.03, [['hp', 2600]], undef);
    _emit($M, 0.00, 0.24, 1500, 160, 'saw', 0.30, 0.001, 0.08, 5200, 900, 0.045);
    _emit($M, 0.00, 0.20, 95, 45, 'sine', 0.26, 0.001, 0.05, undef, undef, 0.04);
    finish('puzzle_lightning', 0.3, $M);
}

sub sfx_puzzle_shadow {   # clue line blacked out — dark thump + swish
    my $M = bake('puzzle_shadow', 0.4);
    _emit($M, 0.00, 0.36, 120, 52, 'sine', 0.52, 0.001, 0.07, undef, undef, 0.07);
    noise_burst($M, 0.00, 0.24, 0.11, 0.004, 0.10, [['lp', 2200, 350]], 0.06);
    _emit($M, 0.02, 0.20, 300, 90, 'tri', 0.14, 0.002, 0.06, undef, undef, 0.06);
    finish('puzzle_shadow', 0.4, $M);
}

sub sfx_puzzle_arcane_blast {   # arcane bomb DETONATES — punchy payoff, damage lands by ear
    my $M = bake('puzzle_arcane_blast', 0.5);
    _emit($M, 0.00, 0.42, 150, 42, 'sine', 0.65, 0.001, 0.16, undef, undef, 0.08);
    noise_burst($M, 0.00, 0.30, 0.30, 0.001, 0.12, [['lp', 5200, 400]], 0.08);
    noise_burst($M, 0.00, 0.08, 0.18, 0.001, 0.04, [['hp', 3800]], undef);
    _emit($M, 0.04, 0.30, 880, 1320, 'tri', 0.10, 0.002, 0.10, undef, undef, 0.06);
    _emit($M, 0.16, 0.24, 1320, 1760, 'sine', 0.07, 0.002, 0.08, undef, undef, 0.05);
    finish('puzzle_arcane_blast', 0.5, $M);
}

sub sfx_puzzle_arcane {   # arcane bomb appears — detuned blips + quick riser
    my $M = bake('puzzle_arcane', 0.34);
    _emit($M, 0.00, 0.08, 660, 660, 'sq', 0.12, 0.001, 0.03, 2400, 2400, undef);
    _emit($M, 0.00, 0.08, 705, 705, 'sq', 0.10, 0.001, 0.03, 2400, 2400, undef);
    _emit($M, 0.09, 0.16, 300, 1200, 'tri', 0.14, 0.002, 0.06, 900, 2600, undef);
    noise_burst($M, 0.09, 0.06, 0.10, 0.001, 0.03, [['hp', 3800]], undef);
    _emit($M, 0.22, 0.10, 900, 900, 'sine', 0.10, 0.001, 0.04, undef, undef, 0.03);
    finish('puzzle_arcane', 0.34, $M, 0.55);   # stacked mids ran ~5 dB hotter than the family
}

# Soft resolution tone when a shadow clue-blackout expires and the veiled
# clue numbers return — much gentler (and quieter) than the ailment_shadow
# application sting, with a slow swell so it never starts with a click.
sub sfx_shadow_veil_lift {
    my $M = bake('shadow_veil_lift', 0.6);
    _emit($M, 0.00, 0.55, 100, 150, 'sine', 0.13, 0.15, 0.25, undef, undef, 0.30);
    _emit($M, 0.08, 0.50, 150, 220, 'tri', 0.06, 0.15, 0.22, undef, undef, 0.25);
    noise_burst($M, 0.28, 0.30, 0.05, 0.12, 0.15, [['hp', 2400]], 0.12);
    _emit($M, 0.30, 0.25, 880, 1200, 'sine', 0.04, 0.10, 0.15, undef, undef, 0.12);
    finish('shadow_veil_lift', 0.6, $M, 0.5);   # trim ~6 dB: resolution reads below the sting
}

sub sfx_boss_phase_shift {
    # RISING 'escalation' horn — the audible opposite of the descending
    # telegraph growls, so a phase change reads as an UPWARD shift even with
    # the screen busy. A strong two-octave saw glide (G3→G5) with a fifth
    # layer and rising sub sustain the energy through the sweep, an air riser
    # shimmers alongside, and a high G6→C7 glint lands the resolve.
    my $M = bake('boss_phase_shift', 1.25);
    _emit($M, 0.00, 1.0, 196, 784, 'saw', 0.26, 0.02, 0.18, 500, 2400, 0.6);
    _emit($M, 0.00, 1.0, 294, 1176, 'saw', 0.15, 0.02, 0.18, 600, 2800, 0.6);
    _emit($M, 0.00, 1.0, 98, 196, 'sine', 0.28, 0.02, 0.16, undef, undef, 0.5);
    noise_burst($M, 0.10, 0.9, 0.08, 0.04, 0.16, [['hp', 1200, 5000]], 0.5);
    _emit($M, 0.78, 0.45, 1568, 2093, 'sine', 0.12, 0.01, 0.10, undef, undef, 0.12);
    finish('boss_phase_shift', 1.25, $M);
}

# ============================================================
# main
# ============================================================
print "Rendering endgame SFX catalog…\n";
for my $sfx (qw(
    vendor_buy vendor_sell loot_filter_save craft_apply
    mana_pickup currency_pickup essence_pickup map_pickup item_claim_unique
    loot_explosion level_up
    player_block player_parry player_deflect monster_kill monster_swing monster_shoot
    hazard_spawn ailment_apply ailment_fire ailment_cold ailment_lightning ailment_shadow ailment_arcane
    ailment_dot_tick ailment_dot_tick_fire ailment_dot_tick_shadow ailment_dot_tick_monster ailment_dot_end ground_fire_tick
    shadow_veil_lift
    puzzle_fire puzzle_cold puzzle_lightning puzzle_shadow puzzle_arcane puzzle_arcane_blast
    boss_phase_shift
)) {
    my $fn = "sfx_$sfx";
    no strict 'refs';
    $fn->();
}
print "Done.\n";
