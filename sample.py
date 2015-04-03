#
# Main program for computing node callgraph stats.
# Uses helpers to invoke systemtap to collect data,
# then aggregate and display that data.  Can either output
# in text formate for direct consumption or fake up
# output similar to the "DTrace" format expected by
# node-stackvis for producing flame graphs
#
from __future__ import absolute_import
import os
import sys
import logging 
import aggregation
from node_systemtap import NodeProfiler, ProfilingError


VALID_OUTPUT_FORMATS = ('text', 'flame')


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def die(msg):
    logger.error(msg)
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


def truncate_frame_path(frame):
    split = frame.split('/')
    if len(split) > 1:
        return split[0] + split[-1]
    return frame


def sanitize_flame_frame(frame):
    return frame.replace('<', '[').replace('>', ']')


# Fake up "dtrace" format stack output for node-stackvis
def output_flamegraph(stacks):
    for stack in stacks:
        # Skip empty stacks
        if not stack:
            continue

        # stackvis doesn't like <, though we do
        for frame in reversed(stack):
            print 'node`{}'.format(sanitize_flame_frame(frame))
        print ' {}'.format(1)


def main():
    if not am_i_root():
        die('Root privileges required.')

    (pid, output_format, duration_s) = parse_args()
    if not pid_exists(pid):
        die('Pid {} does not exist.'.format(pid))

    # stackvis skips first three lines
    print 'Sampling {} for {}s, outputting {}.\n\n'.format(pid, duration_s, output_format)
    profiler = NodeProfiler(logger)

    try:
        stacks = profiler.profile(pid, duration_s)
    except ProfilingError as e:
        die('Profiling failed, exiting. {}'.format(e.message))

    stacks = [[truncate_frame_path(frame) for frame in stack] for stack in stacks]

    assert output_format in VALID_OUTPUT_FORMATS
    if output_format == 'text':
        output_text(aggregation.aggregate(stacks))
    elif output_format == 'flame':
        output_flamegraph(stacks)   

if __name__ == '__main__':
    main()
