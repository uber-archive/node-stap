## Synopsis

Tools for profiling Node.js programs.  Uses SystemTap to collect and symbolicate JavaScript backtraces, extracting human-readable names by walking the V8 stack and heap.
Uses wrapper scripts and [node-stackvis](https://github.com/joyent/node-stackvis) to generate textual or SVG flamegraphs.
Can also output text suitable for input to to [FlameGraph] (https://github.com/brendangregg/FlameGraph).

Inspired and informed by Dave Pacheco's excellent [V8 DTrace ustack helper](https://www.joyent.com/blog/understanding-dtrace-ustack-helpers).

## Safety

**SystemTap is invasive; recommended to try in safe environments before running in production!**

## Caveats

* Only works on 64-bit node processes.
* Line numbers are best effort (not always available) and refer to the start of a function.
* Only tested on node0.10 so far.
* Stacks may omit inlined functions.
* Also may elide frames on very deep stacks to avoid doing too much work in SystemTap probe context.

## Basic Usage

```
[~/uber/node-stap]$ sudo cmd/torch.js 
Usage: torch <pid> <text|flame|raw> <duration (s)>
    text: textual flame graph.
    flame: svg flame graph.
    raw: format suitable for input to FlameGraph tools.
```

## SVG Example

```
dh@dh:~/node-stap$ sudo cmd/torch.js 24701 flame 10 > /tmp/flame.svg
Sampling 24701 for 10s, outputting flame.

dh@dh:~/node-stap$ # done
```

## Raw Example

```
dh@dh:~/node-stap$ sudo node cmd/torch.js 2291 raw 10 > ../raw.txt
Sampling 2291 for 10s, outputting raw.

dh@dh:~/node-stap$ cd ../FlameGraph/
dh@dh:~/FlameGraph$ ./stackcollapse.pl < ../raw.txt  > ../collapsed.txt
dh@dh:~/FlameGraph$ ./flamegraph.pl < ../collapsed.txt  > ../flame.svg

```

## Text Example

```
dh@dh:~/node-stap$ cat ../test.js
var dummy = new Error().stack; // Persuade v8 to compute line numbers

while(true) {
    console.log("Hello!");
}
dh@dh:~/node-stap$ node ../test.js  > /dev/null & 
[1] 2291
dh@dh:~/node-stap$ sudo node cmd/torch.js 2291 text 10
Sampling 2291 for 10s, outputting text.

Total samples: 747
747 node::Start(int, char**):[native]
  747 node::Load(v8::Handle<v8::Object>):[native]
    747 v8::Function::Call(v8::Handle<v8::Object>, int, v8::Handle<v8::Value>*):[native]
      747 v8::internal::Execution::Call(v8::internal::Handle<v8::internal::Object>, v8::internal::Handle<v8::internal::Object>, int, v8::internal::Handle<v8::internal::Object>*, bool*, bool):[native]
        747 [0x72a82a in /usr/bin/nodejs]:[native]
          747 [entry frame]
            747 [internal frame]
              747 [empty]:[unknown]:26
                747 startup:[unknown]:29
                  747 Module.runMain:module.js:494
                    747 Module._load:module.js:274
                        ... [more]
```

## Installation

You'll need SystemTap and headers for your kernel version installed on your system.  Other than that, just clone and profile as above.
Tested with SystemTap 2.7 on linux 3.2.0-79-generic.

## Tests

All things in the fullness of time.

## Contributors

dh

## Future Work

32-bit processes, edge cases in native code symbolication.

## License

node-stap is available under the MIT license. See the LICENSE file for more info.
