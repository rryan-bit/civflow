#!/usr/bin/perl
use strict;
use warnings;

# Ordered list of [pattern, replacement]. Prefixed (hover:/focus:) rules
# come first and match exactly. Bare rules use a negative lookbehind for
# ":" so they never match inside an already-prefixed token (e.g. running
# the "bg-slate-100" rule must not also touch "hover:bg-slate-100").
my @rules = (
  ['focus:border-slate-500', 'focus:border-slate-500 dark:focus:border-slate-400'],
  ['hover:bg-emerald-700', 'hover:bg-emerald-700'], # no-op, kept for documentation
  ['hover:bg-red-100', 'hover:bg-red-100 dark:hover:bg-red-900/40'],
  ['hover:bg-red-50', 'hover:bg-red-50 dark:hover:bg-red-950/40'],
  ['hover:bg-slate-100', 'hover:bg-slate-100 dark:hover:bg-slate-800'],
  ['hover:bg-slate-50', 'hover:bg-slate-50 dark:hover:bg-slate-800'],
  ['hover:bg-slate-800', 'hover:bg-slate-800 dark:hover:bg-slate-600'],
  ['hover:border-slate-300', 'hover:border-slate-300 dark:hover:border-slate-700'],
  ['hover:text-slate-900', 'hover:text-slate-900 dark:hover:text-slate-100'],
  ['(?<!:)bg-amber-50\b', 'bg-amber-50 dark:bg-amber-950/40'],
  ['(?<!:)bg-amber-100\b', 'bg-amber-100 dark:bg-amber-900/40'],
  ['(?<!:)bg-emerald-100\b', 'bg-emerald-100 dark:bg-emerald-900/40'],
  ['(?<!:)bg-red-50\b', 'bg-red-50 dark:bg-red-950/40'],
  ['(?<!:)bg-slate-50\b', 'bg-slate-50 dark:bg-slate-950'],
  ['(?<!:)bg-slate-100\b', 'bg-slate-100 dark:bg-slate-800'],
  ['(?<!:)bg-slate-900\b', 'bg-slate-900 dark:bg-slate-700'],
  ['(?<!:)bg-white\b', 'bg-white dark:bg-slate-900'],
  ['(?<!:)border-amber-200\b', 'border-amber-200 dark:border-amber-800'],
  ['(?<!:)border-red-200\b', 'border-red-200 dark:border-red-800'],
  ['(?<!:)border-red-300\b', 'border-red-300 dark:border-red-700'],
  ['(?<!:)border-slate-200\b', 'border-slate-200 dark:border-slate-800'],
  ['(?<!:)border-slate-300\b', 'border-slate-300 dark:border-slate-700'],
  ['(?<!:)divide-slate-100\b', 'divide-slate-100 dark:divide-slate-800'],
  ['(?<!:)divide-slate-200\b', 'divide-slate-200 dark:divide-slate-800'],
  ['(?<!:)text-amber-700\b', 'text-amber-700 dark:text-amber-300'],
  ['(?<!:)text-amber-800\b', 'text-amber-800 dark:text-amber-300'],
  ['(?<!:)text-amber-900\b', 'text-amber-900 dark:text-amber-200'],
  ['(?<!:)text-emerald-600\b', 'text-emerald-600 dark:text-emerald-400'],
  ['(?<!:)text-emerald-700\b', 'text-emerald-700 dark:text-emerald-400'],
  ['(?<!:)text-red-600\b', 'text-red-600 dark:text-red-400'],
  ['(?<!:)text-red-700\b', 'text-red-700 dark:text-red-400'],
  ['(?<!:)text-red-800\b', 'text-red-800 dark:text-red-300'],
  ['(?<!:)text-red-900\b', 'text-red-900 dark:text-red-300'],
  ['(?<!:)text-slate-600\b', 'text-slate-600 dark:text-slate-400'],
  ['(?<!:)text-slate-700\b', 'text-slate-700 dark:text-slate-300'],
  ['(?<!:)text-slate-900\b', 'text-slate-900 dark:text-slate-100'],
);

for my $file (@ARGV) {
  open(my $fh, '<', $file) or die "Can't read $file: $!";
  my @lines = <$fh>;
  close $fh;

  for my $line (@lines) {
    for my $rule (@rules) {
      my ($pat, $rep) = @$rule;
      next if $rep eq $pat; # skip no-op rules
      $line =~ s/$pat/$rep/g;
    }
  }

  open(my $out, '>', $file) or die "Can't write $file: $!";
  print $out @lines;
  close $out;
}

print "done\n";
