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

/* global Buffer */

var elfy = require('elfy');
var fs = require('fs');
var _ = require('underscore');
var Struct = require('struct');
var AddressMap = require('../address_map');
var demangle = require('../../../build/Release/demangle');

/*
 * Byte-by-byte copy until null terminator from string section.
 */
function getSymName(symStringSection, start) {
    var maxStringLength = 500;
    var b = new Buffer(maxStringLength);
    var off = 0;
    var c;
    while (off < maxStringLength) {
        c = symStringSection.data.readUInt8(start + off);
        if (c === 0) {
            return b.toString(undefined, 0, off);
        }

        b.writeUInt8(c, off++);
    }

    return '<unknown>';
}

/*
 * Instantiate a structure describing on-disk layout of sym table.
 */
function getSymStruct() {
    // typedef struct
    // {
    //      Elf64_Word st_name; /* Symbol name */
    //      unsigned char st_info; /* Type and Binding attributes */
    //      unsigned char st_other; /* Reserved */
    //      Elf64_Half st_shndx; /* Section table index */
    //      Elf64_Addr st_value; /* Symbol value */
    //      Elf64_Xword st_size; /* Size of object (e.g., common) */
    // } Elf64_Sym;
    return new Struct()
        .word32Ule('st_name')
        .word8('st_info')
        .word8('st_other')
        .word16Ule('st_shndx')
        .word64Ule('st_value')
        .word64Ule('st_size');
}

function findSection(elf, name) {
    return _.find(elf.body.sections, function check(sec) {
        return sec.name === name;
    });
}

function addAll(elf, symsSectionName, symStringsSectionName, map) {
    var syms = findSection(elf, symsSectionName);
    var symStrings = findSection(elf, symStringsSectionName);

    if (!syms || !symStrings) {
        return;
    }

    var entry = getSymStruct();

    // Skip over leading null entry
    for (var off = entry.length(); off < syms.size; off += entry.length()) {
        entry.setBuffer(syms.data.slice(off, off + entry.length()));

        // 0 value means external reference
        if (entry.get('st_value') === 0) {
            continue;
        }

        var symName = getSymName(symStrings, entry.get('st_name'));
        symName = demangle.demangle(symName);

        // Adjust for base of section
        var sectionIndex = entry.get('st_shndx');
        var section = elf.body.sections[sectionIndex];

        if (section) {
            var mapBase = section.addr & ~(section.addralign - 1);
            var address = entry.get('st_value');
            map.addEntry(symName, address, entry.get('st_size'), 0, mapBase);
        }
    }
}
/*
 * Given parsed ELF header and section headers, walk symbol table,
 * extracting all symbol names, return address map.
 */
function elfDataToMap(elf) {
    /* eslint-disable max-statements */
    var map = new AddressMap();

    addAll(elf, '.dynsym', '.dynstr', map);
    addAll(elf, '.symtab', '.strtab', map);

    return map;
}

/*
 * Load and parse file data.
 */
function loadMapFromELF(path, callback) {
    fs.readFile(path, function processData(err, data) {
        if (err) {
            return callback(err);
        }

        var elf = elfy.parse(data);
        return callback(null, elfDataToMap(elf));
    });
}

module.exports.load = loadMapFromELF;
