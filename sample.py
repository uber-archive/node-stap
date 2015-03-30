#
# Main program for computing node callgraph stats.
# Uses helpers to invoke systemtap to collect data,
# then aggregate and display that data.
#
from __future__ import absolute_import
import os
import sys
import aggregation
import node_systemtap


VALID_OUTPUT_FORMATS = ('text', 'flame')


def die(msg):
    print msg
    sys.exit(1)


def pid_exists(pid):
    try:
        os.kill(pid, 0)
    except OSError:
        return False

    return True


def am_i_root():
    euid = os.geteuid()
    return euid == 0


def parse_int_arg(name, string):
    try:
        return int(string)
    except ValueError:
        die('Invalid format for {}'.format(name))

    
def parse_args():
    if len(sys.argv) != 4:
        die('Usage: {} <pid> <text|flame> <duration (s)>'.format(sys.argv[0]))

    pid = parse_int_arg('pid', sys.argv[1])
    output_format = sys.argv[2]
    if not output_format in VALID_OUTPUT_FORMATS:
        die('Output format must be "flame" or "text"')
    duration_s = parse_int_arg('duration', sys.argv[3])

    return (pid, output_format, duration_s)


def output_text(tree):
    tree.display()


def output_flamegraph(raw_lines):
    die('Flamegraphs not yet supported.')


def main():
    if not am_i_root():
        die('Root privileges required.')

    (pid, output_format, duration_s) = parse_args()
    if not pid_exists(pid):
        die('Pid {} does not exist.'.format(pid))

    print 'Sampling {} for {}s, outputting {}.\n'.format(pid, duration_s, output_format)
    stacks = node_systemtap.profile(pid, duration_s)
    tree = aggregation.aggregate(stacks)

    assert output_format in VALID_OUTPUT_FORMATS
    if output_format == 'text':
        output_text(tree)       
    elif output_format == 'flame':
        output_flamegraph(tree)   

if __name__ == '__main__':
    main()
