#
# Helpers to invoke systemtap to profile a node
# process and collect the output.
#
from __future__ import absolute_import
import os
import sys
import time
import subprocess
import signal
import logging
import tempfile


NODE_STACK_SCRIPT = 'profile_node.stp'
MAX_ACTIONS_ARG = '-DMAXACTIONS=4000' # default 1000


global_logger = logging.getLogger(__name__)


class ProfilingError(Exception):
    pass


class NodeProfiler(object):
    def __init__(self, logger=global_logger):
        self.logger = logger

    def _parse_raw_lines(self, raw_lines):
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


    def _die(self, msg):
        logger.error(msg)
        sys.exit(1)


    def profile(self, pid, duration_s):
        ''' Launch systemtap to profile a given pid for
        a given period of time.  Raises ProfilingError in case of problems.
        '''
        stap_command = ['stap', MAX_ACTIONS_ARG, NODE_STACK_SCRIPT, str(pid)]
        out_file = tempfile.TemporaryFile('rw')

        try:
            stap_process = subprocess.Popen(stap_command, stdout=out_file, stderr=subprocess.PIPE)
        except OSError as e:
            raise ProfilingError('Failed to execute systemtap: {}'.format(e))

        time.sleep(duration_s)
        os.kill(stap_process.pid, signal.SIGINT) # Should exit cleanly
        time.sleep(2)
        
        # Too scary, we're done here
        if stap_process.poll() is None:
            self.logger.error('Systemtap did not exit after sending SIGINT.  Consider SIGKILL and checking modules...')
            sys.exit(1)

        out_file.seek(0)
        lines = out_file.readlines()

        if stap_process.returncode != 0:
            msg = 'System tap invocation failed. stderr:\n\n{}\n\nlast lines of stdout:\n\n{}'
            raise ProfilingError(msg.format(stap_process.stderr.readlines(), lines[-3:]))

        return self._parse_raw_lines(lines)
