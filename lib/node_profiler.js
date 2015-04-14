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
'use strict';

/* global setTimeout, clearTimeout */

var childProcess = require('child_process');
var tmp = require('tmp');
var util = require('util');
var path = require('path');
var atos = require('./elf-atos/elf-atos');

var NODE_STACK_SCRIPT = path.join(__dirname, 'profile_node.stp');
var MAX_ACTION_TEMPLATE = '-DMAXACTION=%d';
var STAP_PATH = '/usr/bin/stap';
var GENEROUS_STOP_TIMEOUT = 2000;

tmp.setGracefulCleanup();

function NodeProfiler(logger) {
    this.logger = logger;
}

/*
 * Extracts address and maps to symbol.
 */
NodeProfiler.prototype.resolveIfNeeded = function resolveIfNeeded(line) {
    if (!this.symbolicator) {
        return line;
    }

    var match = line.match(/\[native:(.*)\]/);
    if (!match) {
        return line;
    }

    var sym = this.symbolicator.atos(parseInt(match[1], 16));
    return util.format('%s:[native]', sym);
};

/*
 * Turns a stream of individual lines with delimiting newlines into
 * a list of stack traces. On the way, maps native addresses to symbols
 * using symbolicator.
 */
NodeProfiler.prototype.parseRawOutput = function parseRawOutput(rawOutput) {
    var self = this;
    var rawLines = rawOutput.split('\n');
    var stacks = [];
    var currentStack = [];

    rawLines.forEach(function handleLine(line) {
        line = self.resolveIfNeeded(line.trim());
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
 * Launches a SystemTap process to profile a given PID.  Lets it run for a
 * specific number of seconds before sending SIGINT to request clean exit.
 *
 * Returns list of stacktraces, where each stacktrace is a list of frames
 * in reverse-calling order (i.e. index n called index n-1 called index n-2).
 *
 * "maxActions" parameter must be used with care; determines how much work can
 * be done in probe context.  May cause system instability if overly elevated.
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

        atos.getSymbolicatorForPid(pid, function setSymboliicator(err, s) {
            if (err) {
                self.logger.error('Unable to symbolicate:', err);
            }
            self.symbolicator = s;

            // Ready, return an array of lines when we've read all of stdout
            callback(null, self.parseRawOutput(stapStdout));
        });
    }

    function handleError(error) {
        if (error.code === 'ENOENT') {
            self.logger.error('SystemTap not installed!');
        } else {
            self.logger.error('Failed to execute SystemTap:', error.message);
        }

        return callback(error);
    }

    // Should exit, hopefully not too soon
    stapProcess.on('exit', handleExit);
    stapProcess.on('error', handleError);

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
