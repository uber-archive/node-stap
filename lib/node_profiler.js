// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* global setTimeout, clearTimeout */

'use strict';

var childProcess = require('child_process');
var tmp = require('tmp');
var util = require('util');
var path = require('path');

var NODE_STACK_SCRIPT = path.join(__dirname, 'profile_node.stp');
var MAX_ACTION_TEMPLATE = '-DMAXACTION=%d';
var STAP_PATH = '/usr/bin/stap';
var GENEROUS_STOP_TIMEOUT = 2000;

tmp.setGracefulCleanup();

function NodeProfiler(logger) {
    this.logger = logger;
}

NodeProfiler.prototype.parseRawOutput = function parseRawOutput(rawOutput) {
    var rawLines = rawOutput.split('\n');
    var stacks = [];
    var currentStack = [];

    rawLines.forEach(function handleLine(line) {
        line = line.trim();
        if (line) {
            currentStack.push(line);
        } else if (currentStack.length > 0) {
            // Elide extra blank lines
            stacks.push(currentStack);
            currentStack = [];
        }
    });

    if (currentStack.length > 0) {
        stacks.push(currentStack);
    }
    return stacks;
};

/*
 * Returns list of stacktraces, where each stacktrace is a list of frames
 * in reverse-calling order (i.e. index n called index n-1 called index n-2).
 */
NodeProfiler.prototype.profile =
        function profile(pid, durationMilliseconds, maxActions, callback) {
    var self = this;
    var stopTimeout;
    var stapStdout = '';

    var args = [];
    args[0] = NODE_STACK_SCRIPT;
    args[1] = String(pid);
    args[2] = util.format(MAX_ACTION_TEMPLATE, maxActions);

    var stapProcess = childProcess.spawn(STAP_PATH, args, {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    // At a specified time, send SIGINT to tell stap to exit cleanly
    function stopSampling() {
        stapProcess.kill('SIGINT');
        stopTimeout = setTimeout(handleFailureToStop, GENEROUS_STOP_TIMEOUT);
    }

    // Failure to exit it too scary, we're done
    function handleFailureToStop() {
        self.logger.error('Systemtap failed to stop in a timely fashion.');
        self.logger.error('suggest kill -9 and check modules.');
        throw new Error('Systemtap failed to exit.');
    }

    // Handle clean or unclean process exit
    function handleExit(exitEvent) {
        // Cancellation done or unnecessary
        if (stopTimeout) {
            clearTimeout(stopTimeout);
        }

        if (exitEvent !== 0) {
            self.logger.error('Systemtap exited unexpectedly', {
                type: exitEvent
            });

            return callback(new Error('Profiling failed.'));
        }

        // OK, success, return an array of lines when we've read all of stdout
        callback(null, self.parseRawOutput(stapStdout));
    }

    // Should exit, hopefully not too soon
    stapProcess.on('close', handleExit);

    // Stderr is echoed
    stapProcess.stderr.on('data', function logStderr(data) {
        self.logger.error('[stap stderr]', data.toString());
    });

    // Stdout is buffered for later
    stapProcess.stdout.on('data', function handleStdoutData(data) {
        stapStdout += data.toString();
    });

    // And we'll tell it to exit at some point
    stopTimeout = setTimeout(stopSampling, durationMilliseconds);
};

module.exports = NodeProfiler;
