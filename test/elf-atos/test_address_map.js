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
var AddressMap = require('../../lib/elf-atos/address_map');

test('Empty map never returns anything', function testEmpty(assert) {
    var map = new AddressMap();

    assert.notOk(map.getEntryForOffset(0x1000), 'nope');
    assert.end();
});

test('Map with one entry', function testSingle(assert) {
    var map = new AddressMap();

    map.addEntry('entry1', 0x1000, 0x1000, 0x0);
    assert.notOk(map.getEntryForOffset(0x50), 'Miss below range');
    assert.notOk(map.getEntryForOffset(0x3000), 'Miss above range');

    var entry = map.getEntryForOffset(0x1500);
    assert.ok(entry, 'Find within range');
    assert.equal(entry.base, 0x1000, 'With right base');
    assert.equal(entry.length, 0x1000, 'And right length');

    assert.end();
});

test('Map with two entries', function testTwoEntries(assert) {
    var map = new AddressMap();

    map.addEntry('entry1', 0x1000, 0x1000, 0x0);
    map.addEntry('entry2', 0x4000, 0x1000, 0x0);

    assert.notOk(map.getEntryForOffset(0x50), 'Miss below range');
    assert.notOk(map.getEntryForOffset(0x3000), 'Miss between');
    assert.notOk(map.getEntryForOffset(0x6000), 'Miss above');

    var entry = map.getEntryForOffset(0x1500);
    assert.ok(entry, 'Find within first range');
    assert.equal(entry.base, 0x1000, 'With right base');
    assert.equal(entry.length, 0x1000, 'And right length');

    entry = map.getEntryForOffset(0x4500);
    assert.ok(entry, 'Find within second range');
    assert.equal(entry.base, 0x4000, 'With right base');
    assert.equal(entry.length, 0x1000, 'And right length');
    assert.end();
});

test('Entry with mapped entity offset', function testMappedOffset(assert) {
    var map = new AddressMap();

    map.addEntry('entry1', 0x1000, 0x1000, 0x4000);
    assert.notOk(map.getEntryForOffset(0x50), 'Miss below range');
    assert.notOk(map.getEntryForOffset(0x3000), 'Miss above range');

    var entry = map.getEntryForOffset(0x1500);
    assert.ok(entry, 'Find within range');
    assert.equal(entry.base, 0x1000, 'With right base');
    assert.equal(entry.length, 0x1000, 'And right length');
    assert.equal(entry.mappedEntityOffset, 0x4000, 'And right offset');

    assert.end();
});

// Corresponds to section with base address 0x40000, symbol with address 0x40050
test('Entry with fixed base address', function testFixedBase(assert) {
    var map = new AddressMap();

    map.addEntry('entry1', 0x40100, 0x1000, 0, 0x40000);
    assert.notOk(map.getEntryForOffset(0x50), 'Miss below range');
    assert.notOk(map.getEntryForOffset(0x3000), 'Miss above range');

    var entry = map.getEntryForOffset(0x150);
    assert.ok(entry, 'Find within range');
    assert.equal(entry.base, 0x40100, 'With right base');
    assert.equal(entry.length, 0x1000, 'And right length');
    assert.equal(entry.mappedEntityOffset, 0, 'And right offset');
    assert.equal(entry.loadBase, 0x40000, 'And right section base');

    assert.end();
});
