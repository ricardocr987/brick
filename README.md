The purpose of starting this project was to monetize datasets and enable user permissions by utilizing tokenization, with the aim of creating a secure and transparent system for accessing valuable data while ensuring its integrity and authenticity through the use of token burning [Check Fishnet](https://twitter.com/fishnet_tech) and was inspired by [this program](https://github.com/danmt/create-mint-and-metadata-on-chain).

Use cases that might use this protocol:
- Tokenization of on-chain investment funds (this is what I want to explore, share access ix would be eliminated)
- Token gating: dataset marketplace, articles app, event ticketing app, ...
- SaaS monetization
- Inventory management & payment method for a store

Brick is a payment protocol (or sales contract) that allows sellers to tokenize goods, services or assets by setting up a configuration (or conditions of the sales contract), giving to their token some functionalities. Here's how it works:

1. Set the token you want to receive in the sale.
2. Choose between an unlimited or limited sale. In the case of a limited sale, define how many sales you want to make.
3. Set the time period during which the buyer can get a refund (it can be set to 0). If the buyer burns the token, they won't be able to access the funds, and the seller will have to wait for the set time to withdraw the funds.
4. If you are building an app that wants to create a marketplace, you have the option to set fees to the permissionless market you are creating.

Once the sale is completed, the seller is responsible for providing the buyer with access to the purchased good, service, or asset. This is achieved by calling the "use_asset" instruction, which burns the token purchased by the buyer, effectively giving them access to the item listed by the seller. This process is designed to be simple and secure, ensuring that both the seller and buyer can transact with confidence using Brick.

To facilitate the use of Brick in different applications, an indexer is currently being developed. The indexer will provide easy access to information about various events and accounts associated with Brick transactions, enabling any app that uses Brick to retrieve data quickly and efficiently. With this feature, developers can build more complex applications that leverage Brick's functionality without worrying about the underlying blockchain technology.

Diagram to understand the logic of the Solana program:<img width="900" alt="Screenshot 2023-03-08 at 10 36 31" src="https://user-images.githubusercontent.com/32191898/223676957-593666bd-7af1-4118-837d-766e01669f23.png">

TO-DO:
- Indexer (Currently building)
- Rust crate that facilitates composability with other programs, making it easy for specific use cases to integrate, using the core functionalities via CPI's
- TypeScript library with transaction/instruction handling, data fetching, and type definitions to streamline app development and improve reliability
