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

var test = require('tape');
var aggregation = require('../lib/aggregation');
var _ = require('underscore');

test('aggregate trivial stack', function testTrivial(assert) {
    var name = 'foo';
    var stacks = [[name]];
    var tree = aggregation.aggregate(stacks);

    assert.notOk(tree.name, 'root is dummy');
    assert.strictEqual(tree.count, 1, 'but has accurate total count');
    assert.equal(_.size(tree.children), 1, 'with one child');
    assert.ok(tree.children[name], 'of the right name');
    assert.equal(tree.children[name].count, 1, 'with count 1 itself');
    assert.end();
});

test('aggregate two trivial stacks', function testTwoSimple(assert) {
    var name1 = 'foo';
    var name2 = 'bar';
    var stacks = [[name1], [name2]];
    var tree = aggregation.aggregate(stacks);

    assert.notOk(tree.name, 'root is dummy');
    assert.strictEqual(tree.count, 2, 'but has accurate total count');
    assert.equal(_.size(tree.children), 2, 'and two children');
    assert.ok(tree.children[name1], 'of the right names');
    assert.ok(tree.children[name2], 'of the right names');
    assert.equal(tree.children[name1].count, 1, 'with count 1 themselves');
    assert.equal(tree.children[name2].count, 1, 'with count 1 themselves');
    assert.end();
});

test('aggregate nontrivial stacks', function testNontrivial(assert) {
    /* eslint-disable max-statements */
    var stacks = [
        ['main', 'foo', 'bar'],
        ['main', 'foo', 'baz'],
        ['main', 'parse', 'strlen'],
        ['__start']
    ];
    var tree = aggregation.aggregate(stacks);

    assert.notOk(tree.name, 'root is dummy');
    assert.strictEqual(tree.count, stacks.length,
            'but has accurate total count');
    assert.equal(_.size(tree.children), 2, 'two children');
    assert.ok(tree.children.main, 'of the right names');
    assert.ok(tree.children.__start, 'of the right names');

    var main = tree.children.main;
    assert.equal(main.count, 3, 'and counts');
    assert.equal(tree.children.__start.count, 1, 'and counts');
    assert.ok(main.children.foo);
    assert.ok(main.children.parse);

    var foo = main.children.foo;
    var parse = main.children.parse;
    assert.equal(foo.count, 2);
    assert.equal(parse.count, 1);

    assert.ok(foo.children.bar);
    assert.ok(foo.children.baz);
    assert.equal(foo.children.bar.count, 1, 'and counts');
    assert.equal(foo.children.baz.count, 1, 'and counts');

    var string = tree.display();
    var desired =
        'Total samples: 4\n' +
        '3 main\n' +
        '  2 foo\n' +
        '    1 bar\n' +
        '    1 baz\n' +
        '  1 parse\n    ' +
        '1 strlen\n' +
        '1 __start\n';

    assert.equal(string, desired);
    assert.end();
});
