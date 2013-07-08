# merkle tree protocol

## asymetrical protocol

exchange top hashes,
and if they are the same. stop.

If they are different,
pick short straws to see who is the leader.

If hash(me, you) < hash(you, me)
then I am the sender.
do it this way so that there is no way
to predict who will be the leader.
(that feels like the secure way)

If I am not the leader, wait to receive a hash list.

If I am the leader, send all my hashes with prefix ''

If I receive a hash list, check against my hashlist
for that prefix. there are 3 possible cases.

1. I have extra hashes
2. I have missing hashes.
3. I have some different hashes

1. If I have extra hashes,
  send all objects with that prefix.

2. If I have missing hashes
  request other side to send those hashes.

3. If there are different hashes
  take the prefixes of the next layer.

is the protocol simpler if it's symmetrical?
then I can ignore 2.
which also means that I don't have to handle
receiving the request.

also, can skip the short straws.

## symmetrical protocol


exchange top hashes,
and if they are the same. stop.

If they are different,
send all my hashes with prefix ''

If I receive a hash list, check against my hashlist
for that prefix. there are 3 possible cases.

1. I have extra hashes
2. I have missing hashes.
3. I have some different hashes

1. If I have extra hashes,
  send all objects with that prefix.

2. If I have missing hashes
  do nothing. the other side will send their objects.

3. If there are different hashes
  take the prefixes of the next layer.

  this case is the same action as for the top hash!
