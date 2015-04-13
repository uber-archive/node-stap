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

var _ = require('underscore');
var util = require('util');

/*
 * Simple class to describe a callgraph with frequency counts.
 */
function StackNode(name) {
    this.name = name;
    this.count = 0;
    this.children = Object.create(null);
}

StackNode.prototype.indent = function indent(depth) {
    return Array(depth).join('  ');
};

/*
 * Worker for recursive display of tree
 */
StackNode.prototype._display = function _display(depth) {
    var result = '';

    /* eslint-disable no-console */
    if (!this.name) {
        var totalSamples = _.map(this.children, function getCount(child) {
            return child.count;
        }).reduce(function reduceSum(total, count) {
            return total + count;
        }, 0);
        result += util.format('Total samples: %d\n', totalSamples);
    } else {
        var indent = this.indent(depth);
        result += util.format('%s%s %s\n', indent, this.count, this.name);
    }

    _.each(this.children, function printChild(child) {
        result += child._display(depth + 1);
    });

    return result;
};

/*
 * Start recursive display of tree.
 */
StackNode.prototype.display = function display() {
    return this._display(0);
};

/*
 * Only export of this module.
 *
 * Given a list of stack frames (i.e. a list of
 * lists of strings, where index i called index i+1),
 * aggregate into a tree.
 */
function aggregate(stacks) {
    var root = new StackNode();

    stacks.forEach(function handleStack(stack) {
        var current = root;
        current.count++;

        stack.forEach(function handleFrame(frame) {
            if (!_.has(current.children, frame)) {
                current.children[frame] = new StackNode(frame);
            }

            current = current.children[frame];
            current.count++;
        });
    });

    return root;
}

module.exports.aggregate = aggregate;
