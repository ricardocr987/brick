Brick is a protocol that allows you as a seller to tokenize a good, service or asset by setting up a configuration:

- Set the token you want to receive in the sale.
- Set if you want to make an unlimited or limited sale, in this case define how many sales you want to make.
- Set the time the buyer can get a refund (it can be 0), if the buyer burns the token, won't be able to access to the funds, you will have to wait the set time to withdraw the funds.

The seller is the one who will be responsible for giving access to the buyer of the good, service or asset. Calling the instruction use_asset (in which the token, previously purchased, is burned by the buyer), would mean giving access to that buyer to whatever the seller has listed. To facilitate this, I am building an indexer so that any app that uses Brick in the background can get the information of the different events and accounts easily.

# Diagram to understand the logic of the Solana program:![Screenshot 2023-03-01 at 22 40 32](https://user-images.githubusercontent.com/32191898/222271446-954f59f2-c715-4813-822b-9028fdfbacc7.png)
