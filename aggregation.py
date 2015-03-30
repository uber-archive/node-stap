#
# Helpers to aggregate stack traces into a tree,
# counting the incidence of a given function at 
# a given position in the callgraph.
#

class StackNode:
    ''' Simple class to describe a callgraph with 
    frequency counts.
    '''
    def __init__(self, name):
        self.name = name
        self.count = 0
        self.children = {}


    def display(self, depth=0):
        ''' Recursively print tree.'''
        # Root has no name (a dummy), we skip it)
        if not self.name:
            total_samples = sum([child.count for child in self.children.values()])
            print 'Total samples: {}'.format(total_samples)
        else:
            print '{}{} {}'.format(depth * '  ', self.count, self.name)

        for child in self.children.itervalues():
            child.display(depth + 1)


def aggregate(stacks):
    ''' Takes list of stacks (a list of lists, where
    each element is a list of frames and index i called
    index i+1.  Returns a tree of StackNode instances.
    '''
    root = StackNode('')    
    for stack in stacks:
        current = root;
        for frame in stack:
            if not frame in current.children:
                current.children[frame] = StackNode(frame)
            current = current.children[frame]
            current.count += 1
    return root
