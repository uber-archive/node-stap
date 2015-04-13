#!/bin/bash

# Copyright (c) 2015 Uber Technologies, Inc.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

#
# This method only works on Linux.  So... run it there.
#

function die_if_failed {
    if [[ $? != 0 ]]; then 
        echo "Failed $*"
        exit 1
    fi
}

tmpfile=$(mktemp -t testXXXXXX)
cppfile="${tmpfile}.cpp"
code='void foo(int x, const char *y) {}'
signature='foo(int, char const*)'

mv "${tmpfile}" "${cppfile}.cpp" 
die_if_failed  "Couldn't move file"

echo "${code}" > "${cppfile}" 
die_if_failed "Couldn't populate file"

objfile=${cppfile/cpp/o}
g++ -c "${cppfile}" -o "${objfile}" 
die_if_failed "Couldn't compile file"

mangled=$(nm ${objfile} | grep T | grep foo | cut -d \  -f 3)
die_if_failed "Could not get demangled name"

if [[ -z "${mangled}" ]]; then 
    echo "Could not get mangled sym"
    exit 1
fi

demangled=$(node -e "console.log(require('../build/Release/demangle').demangle('${mangled}'))")
echo "Mangled: ${mangled}"
echo "Demangled: ${demangled}"


