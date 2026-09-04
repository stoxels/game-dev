#!/usr/bin/env perl
# ============================================================
#  generate_boss_audio.pl
#  Renders Freebuff/Stoxels endgame-boss audio as .wav files,
#  entirely from code — no external audio tools required.
#
#  Outputs:
#    audio/sfx/endgame/sfx_boss_roar.wav    monster arrival / enrage roar (mono)
#    audio/sfx/endgame/sfx_boss_cleave_sweep.wav  wide boss swing sweep (mono)
#
#  Run:  perl tools/audio-gen/generate_boss_audio.pl
#
#  Every voice is synthesised per sample: band-limited-ish additive
#  oscillators (sine / triangle / square / saw), filtered white noise,
#  ADSR envelopes and glide + filter sweeps. Tweak the data and
#  re-run to re-roll the audio.
# ============================================================
use strict;
use warnings;
use File::Basename;
use File::Spec;

use constant SR => 44100;
use constant TAU => 6.283185307179586;

my $ROOT = File::Spec->rel2abs(File::Spec->catdir(dirname($0), '..', '..'));

# Deterministic renders: the same script run always produces the same files,
# so tweaking one voice never silently re-rolls the noise in the others.
srand(20260903);

sub mtof { my ($m) = @_; return 440 * 2 ** (($m - 69) / 12); }

# ------------------------------------------------------------
# Shared 1-second white-noise buffer (cyclic reads for bursts)
# ------------------------------------------------------------
my @NOISE = map { rand() * 2 - 1 } 1 .. SR;

# Additive partial tables: [ [harmonic, coefficient], ... ]
my %SHAPES = (
    sine => [[1, 1]],
    tri  => [[1, 1], [3, -1 / 9],    [5, 1 / 25]],
    sq   => [[1, 1], [3, 1 / 3],     [5, 1 / 5]],
    saw  => [[1, 1], [2, 1 / 2],     [3, 1 / 3],     [4, 1 / 4]],
);

# Piecewise envelope: attack ramp in, hold, release ramp to zero at dur.
sub _env {
    my ($tt, $dur, $att, $rel) = @_;
    return 0 if $tt >= $dur;
    if ($tt < $att) { return $att > 0 ? $tt / $att : 1; }
    if ($tt > $dur - $rel) { my $x = $dur - $tt; return $rel > 0 && $x > 0 ? $x / $rel : 0; }
    return 1;
}

# ------------------------------------------------------------
# _emit — one additive-oscillator note into $L and/or $R arrays
#   f0/f1  : start/end frequency (linear glide)
#   shape  : sine | tri | sq | saw
#   cf0/cf1: optional one-pole lowpass cutoff sweep (undef = off)
#   tau    : optional extra exponential decay
# ------------------------------------------------------------
sub _emit {
    my ($L, $R, $t0, $dur, $f0, $f1, $shape, $vol, $att, $rel, $pan, $cf0, $cf1, $tau) = @_;
    my $sr = SR;
    my $i0 = int($t0 * $sr);
    my $n  = int($dur * $sr);
    return if $n <= 0;
    my $co = $SHAPES{$shape} || $SHAPES{sine};
    $cf1 = $cf0 if !defined $cf1;

    my ($gl, $gr);
    if (defined $R) {
        my $pa = $pan; $pa = -1 if $pa < -1; $pa = 1 if $pa > 1;
        $gl = cos((1 + $pa) * 3.14159265358979 / 4) * $vol;
        $gr = sin((1 + $pa) * 3.14159265358979 / 4) * $vol;
    } else {
        $gl = $vol;
    }

    my $ph   = 0;
    my $y    = 0;
    my $hasf = defined $cf0 && $cf0 > 0;
    for (my $i = 0; $i < $n; $i++) {
        my $idx = $i0 + $i;
        my $tt  = $i / $sr;
        my $fr  = $f0 + ($f1 - $f0) * ($tt / $dur);
        $fr = 20 if $fr < 20;
        $ph += TAU * $fr / $sr;
        $ph -= TAU * 2 if $ph > TAU * 2;

        my $v = 0;
        for my $c (@$co) { $v += $c->[1] * sin($c->[0] * $ph); }

        if ($hasf) {
            my $fc = $cf0 + ($cf1 - $cf0) * ($tt / $dur);
            $fc = 20 if $fc < 20;
            my $a = 1 - exp(-TAU * $fc / $sr);
            $y += $a * ($v - $y);
            $v = $y;
        }

        my $e = _env($tt, $dur, $att, $rel);
        $e *= exp(-$tt / $tau) if $tau;
        my $val = $v * $e;
        $L->[$idx] += $val * $gl if defined $L;
        $R->[$idx] += $val * $gr if defined $R;
    }
}

sub emit_mono { my ($m, @rest) = @_; _emit($m, undef, @rest); }

# ------------------------------------------------------------
# noise_burst — filtered white-noise burst
#   ops: [ [type, f0, (f1)], ... ] type 'lp'|'hp', applied in order
# ------------------------------------------------------------
sub noise_burst {
    my ($L, $R, $t0, $dur, $vol, $att, $rel, $ops, $tau) = @_;
    my $sr = SR;
    my $i0 = int($t0 * $sr);
    my $n  = int($dur * $sr);
    return if $n <= 0;

    my ($gl, $gr);
    if (defined $R) {
        $gl = $vol * 0.7071; $gr = $vol * 0.7071;   # centre pan
    } else {
        $gl = $vol;
    }

    my @st = (0) x scalar(@$ops);
    for (my $i = 0; $i < $n; $i++) {
        my $idx = $i0 + $i;
        my $tt  = $i / $sr;
        my $x   = $NOISE[$idx % $sr];
        my $oi  = 0;
        for my $op (@$ops) {
            my ($type, $f0, $f1) = @$op;
            my $fr = defined $f1 ? $f0 + ($f1 - $f0) * ($tt / $dur) : $f0;
            $fr = 20 if $fr < 20;
            my $a = 1 - exp(-TAU * $fr / $sr);
            if ($type eq 'lp') {
                $st[$oi] += $a * ($x - $st[$oi]);
                $x = $st[$oi];
            } else { # highpass = input minus lowpassed input
                my $lp = $st[$oi] + $a * ($x - $st[$oi]);
                $x = $x - $lp;
                $st[$oi] = $lp;
            }
            $oi++;
        }
        my $e = _env($tt, $dur, $att, $rel);
        $e *= exp(-$tt / $tau) if $tau;
        my $val = $x * $e;
        $L->[$idx] += $val * $gl if defined $L;
        $R->[$idx] += $val * $gr if defined $R;
    }
}

sub noise_mono { my ($m, @rest) = @_; noise_burst($m, undef, @rest); }

# ------------------------------------------------------------
# WAV writer — $chans is an arrayref of float channel arrays
# ------------------------------------------------------------
sub write_wav {
    my ($path, $chans, $sr) = @_;
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
    my $byteRate   = $sr * $ch * 2;
    my $blockAlign = $ch * 2;
    my $hdr = 'RIFF' . pack('V', 36 + length($data)) . 'WAVE' .
        'fmt ' . pack('VvvVVvv', 16, 1, $ch, $sr, $byteRate, $blockAlign, 16) .
        'data' . pack('V', length($data));
    open(my $fh, '>:raw', $path) or die "cannot write $path: $!";
    print $fh $hdr, $data;
    close($fh);
    printf "wrote %-46s %6.2f s  %5.2f MB  (%d ch, %d Hz)\n",
        $path, $n / $sr, length($data) / 1048576, $ch, $sr;
}

# Normalise a channel set to a target peak.
# DC bias (asymmetric layers can lean a waveform off zero, which some
# speakers translate into a thump) is stripped first — but only when it is
# real (>= ~1 LSB at 16-bit), so DC-clean renders stay byte-identical.
sub normalise {
    my ($chans, $target) = @_;
    for my $c (@$chans) {
        my $sum = 0;
        $sum += $_ for @$c;
        my $mean = $sum / scalar(@$c);
        if (abs($mean) * 32767 >= 1.0) {
            for my $i (0 .. $#$c) { $c->[$i] -= $mean; }
        }
    }
    my $peak = 0;
    for my $c (@$chans) { for my $v (@$c) { my $a = abs($v); $peak = $a if $a > $peak; } }
    return if $peak <= 0;
    my $s = $target / $peak;
    for my $c (@$chans) { for my $i (0 .. $#$c) { $c->[$i] *= $s; } }
}

# ------------------------------------------------------------
# Note scheduler: one spec = one voice on an absolute beat grid.
# ------------------------------------------------------------
sub _sched_note {
    my ($beat, $dur_beats, $midi0, $midi1, $shape, $vol, $att, $rel, $cf0, $cf1, $tau) = @_;
    return {
        b   => $beat, d  => $dur_beats,
        f0  => mtof($midi0), f1 => mtof($midi1),
        s   => $shape, v => $vol, a => $att, r => $rel,
        cf0 => $cf0, cf1 => $cf1, tau => $tau,
    };
}

# Emits one spec (or an arrayref of specs) at beat $t0_beats.
sub emit_beat {
    my ($L, $R, $t0_beats, $spb, $notes, $pan) = @_;
    $pan = 0 unless defined $pan;
    $notes = [$notes] if ref($notes) eq 'HASH';
    for my $n (@$notes) {
        _emit($L, $R,
            ($t0_beats + $n->{b}) * $spb, $n->{d} * $spb,
            $n->{f0}, $n->{f1}, $n->{s}, $n->{v}, $n->{a}, $n->{r}, $pan,
            $n->{cf0}, $n->{cf1}, $n->{tau});
    }
}

# --- percussion --------------------------------------------------
sub _kick  { my ($L, $R, $t, $vol) = @_; $vol = 0.8 unless defined $vol;
    _emit($L, $R, $t, 0.26, 150, 42, 'sine', $vol, 0.001, 0.02, 0, undef, undef, 0.09);
    noise_burst($L, $R, $t, 0.03, $vol * 0.25, 0.001, 0.02, [['lp', 900]], undef);
}
sub _snare { my ($L, $R, $t, $vol) = @_; $vol = 0.4 unless defined $vol;
    noise_burst($L, $R, $t, 0.17, $vol, 0.001, 0.05, [['hp', 1300]], 0.05);
    _emit($L, $R, $t, 0.11, 200, 150, 'tri', $vol * 0.5, 0.001, 0.02, 0, undef, undef, 0.04);
}
sub _hat   { my ($L, $R, $t, $open, $vol) = @_; $vol = 0.12 unless defined $vol;
    if ($open) {
        noise_burst($L, $R, $t, 0.30, $vol * 1.3, 0.001, 0.06, [['hp', 6800]], 0.10);
    } else {
        noise_burst($L, $R, $t, 0.045, $vol, 0.001, 0.02, [['hp', 7600]], undef);
    }
}
sub _crash { my ($L, $R, $t, $vol) = @_; $vol = 0.15 unless defined $vol;
    noise_burst($L, $R, $t, 0.9, $vol, 0.001, 0.1, [['hp', 2200], ['lp', 9500]], 0.3);
}

# ============================================================
#  1) BOSS ROAR — layered detuned saws with falling filters
# ============================================================
sub render_boss_roar {
    my $dur = 1.55;
    my $n   = int($dur * SR);
    my @M   = (0) x $n;
    my $Mr  = \@M;

    _emit($Mr, undef, 0.00, 1.45, 94, 46, 'saw', 0.30, 0.10, 0.28, 0, 850, 90, 0.55);
    _emit($Mr, undef, 0.06, 1.40, 79, 38, 'saw', 0.24, 0.12, 0.30, 0, 720, 80, 0.60);
    _emit($Mr, undef, 0.00, 1.40, 58, 27, 'sine', 0.55, 0.03, 0.25, 0, undef, undef, 0.40);
    noise_burst($Mr, undef, 0.02, 1.50, 0.18, 0.10, 0.35, [['lp', 300, 55]], 0.60);
    _emit($Mr, undef, 1.02, 0.45, 130, 220, 'saw', 0.13, 0.01, 0.10, 0, 600, 200, 0.15);

    normalise([$Mr], 0.9);
    my $path = File::Spec->catfile($ROOT, 'audio', 'sfx', 'endgame', 'sfx_boss_roar.wav');
    write_wav($path, [$Mr], SR);
}

# ============================================================
#  3) CLEAVE SWEEP — wide monster swing
# ============================================================
sub render_cleave_sweep {
    my $dur = 0.95;
    my $n   = int($dur * SR);
    my @M   = (0) x $n;
    my $Mr  = \@M;

    noise_burst($Mr, undef, 0.00, 0.45, 0.55, 0.02, 0.06, [['lp', 300, 6800]], 0.16);
    noise_burst($Mr, undef, 0.36, 0.56, 0.48, 0.04, 0.12, [['lp', 6800, 320]], 0.10);
    noise_burst($Mr, undef, 0.10, 0.50, 0.08, 0.03, 0.10, [['hp', 5200]], 0.09);
    _emit($Mr, undef, 0.00, 0.22, 130, 55, 'sine', 0.50, 0.002, 0.05, 0, undef, undef, 0.06);
    _emit($Mr, undef, 0.42, 0.30, 90, 40, 'sine', 0.35, 0.004, 0.08, 0, undef, undef, 0.08);

    normalise([$Mr], 0.9);
    my $path = File::Spec->catfile($ROOT, 'audio', 'sfx', 'endgame', 'sfx_boss_cleave_sweep.wav');
    write_wav($path, [$Mr], SR);
}

# ============================================================
# main
# ============================================================
print "Rendering boss roar…\n";
render_boss_roar();
print "Rendering cleave sweep…\n";
render_cleave_sweep();
print "Done.\n";
