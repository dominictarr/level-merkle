# level-merkle

merkle tree replication.

[![travis](https://travis-ci.org/dominictarr/level-merkle.png?branch=master)
](https://travis-ci.org/dominictarr/level-merkle)

[![testling](http://ci.testling.com/dominictarr/level-merkle.png)
](http://ci.testling.com/dominictarr/level-merkle)

## Synopsis

Use [merkle-trees](http://en.wikipedia.org/wiki/Merkle_tree) to replicate data sets.
Data must be sets, and currently, deletes are not supported.

## rewrite planned

After writing this, i realized [many things](https://gist.github.com/dominictarr/5990143),
and plan to rewrite this module - possibly decoupling from level,
but at least, creating the tree from an inorder stream of hashes.
This will gain the ability to replicate arbitary subsets.


## License

MIT
