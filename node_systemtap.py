#
# Helpers to invoke systemtap to profile a node
# process and collect the output.
#
from __future__ import absolute_import
import os
import time
import subprocess
import signal


NODE_STACK_SCRIPT = 'profile_node.stp'


def parse_raw_lines(raw_lines):
    '''Convert output of profile_node.stp (as list of lines) to a list 
    of lists where each element is a stacktrace (and index i called 
    index i+1)
    '''
    stacks = []
    current_stack = []
    for line in raw_lines:
        line = line.strip()
        if line:
            current_stack.append(line)
        else:
            current_stack.reverse()
            stacks.append(current_stack)    
            current_stack = []

    current_stack.reverse()
    stacks.append(current_stack)
    return stacks


def profile(pid, duration_s):
    ''' Launch systemtap to profile a given pid for
    a given period of time.
    '''
    stap_command = ['stap', NODE_STACK_SCRIPT, str(pid)]
    stap_process = subprocess.Popen(stap_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(duration_s)
    os.kill(stap_process.pid, signal.SIGINT) # Should exit cleanly

    return parse_raw_lines(stap_process.stdout.readlines())
