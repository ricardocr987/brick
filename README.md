This project was started with the intention to monetize datasets and give permissions to the users by burning the token that represents that dataset [Check Fishnet](https://twitter.com/fishnet_tech) and was inspired by [this program](https://github.com/danmt/create-mint-and-metadata-on-chain).

Use cases that might use this protocol:
- Tokenization of on-chain investment funds (this is what I want to explore, share access ix would be eliminated)
- Token gating: dataset marketplace, article app, Event ticketing ...
- SaaS
- Inventory management & payment method for a physical store

Brick is a payment protocol or sales contract that allows sellers to tokenize goods, services or assets by setting up a configuration or conditions of the sales contract, giving to their token some functionalities. Here's how it works:

1. Set the token you want to receive in the sale.
2. Choose between an unlimited or limited sale. In the case of a limited sale, define how many sales you want to make.
3. Set the time period during which the buyer can get a refund (it can be set to 0). If the buyer burns the token, they won't be able to access the funds, and the seller will have to wait for the set time to withdraw the funds.

4. If you are an app that wants to create a marketplace, you have the option to set fees to the market you are creating.

As the seller, you will be responsible for giving the buyer access to the good, service, or asset. This is done by calling the "use_asset" instruction, in which the token purchased by the buyer is burned, giving them access to whatever the seller has listed. To facilitate this process, I am building an indexer so that any app that uses Brick in the background can easily access information about different events and accounts.

Diagram to understand the logic of the Solana program:![Screenshot 2023-03-07 at 19 58 44](https://user-images.githubusercontent.com/32191898/223523825-38d1b792-008a-4bce-bf6d-d48db49d0dc9.png)

TO-DO:
- Indexer (Currently building)
- Rust crate to make easier composability with other programs. Ideally, specific use cases should use this and do CPIs in their program.
- Typescript library to make easier to build apps on top of it: Transaction/Instructions, fetching data and types definitions.
