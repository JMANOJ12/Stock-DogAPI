const fs = require('fs'); 
const http = require('http');
const https = require('https'); 
const port = 3000;


// getting our apiKey
const config = require("./authentication/config.json");
const apiKey = config.apiKey;
const cache = {};
const server = http.createServer(); 
server.on("request", connection_handler);

function connection_handler(req, res) {
  console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);

  if (req.url === "/") {
    const main = fs.createReadStream("html/index.html");
    res.writeHead(200, { "Content-Type": "text/html" });
    main.pipe(res);
  } else if (req.url.startsWith("/search")) {
    const user_input = new URL(req.url, `https://${req.headers.host}`).searchParams;
    const query = user_input.get("query");

    if (query == null || query.trim() === "") {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h1>Missing Input!</h1>");
    } else {
      const cacheKey = query.toLowerCase(); // Generate a cache key based on the query

      // Check if the response is already cached
      if (cache[cacheKey] && cache[cacheKey].expires > Date.now()) {
        console.log(`Serving cached response for query: ${query}`);
        console.log("Cache Contents:", cache);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(cache[cacheKey].response);
      } else {
        //query is like a place holder
        const apiUrl = `https://financialmodelingprep.com/api/v3/quote/${query}?apikey=${apiKey}`;
        https.get(apiUrl, (response) => {
          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            const stockQuotes = JSON.parse(data);
            console.log("Stock Results:", stockQuotes);

            // Make the second API request to the dog API
            const dogUrl = "https://dog.ceo/api/breeds/image/random";
            https.get(dogUrl, (dogResponse) => {
              let dogData = "";

              dogResponse.on("data", (chunk) => {
                dogData += chunk;
              });

              dogResponse.on("end", () => {
                const dogImage = JSON.parse(dogData).message;
                console.log("Dog API Response:", dogImage);

                // Process the API responses and generate the final response
                const finalResponse = processAPIResponses(stockQuotes, dogImage);


                // Store the response in the cache
                cache[cacheKey] = {
                  response: finalResponse,
                  expires: Date.now() + 30 * 1000, // Cache expiration time: 30 seconds
                };

                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(finalResponse);
              });
            }).on("error", (error) => {
              console.error("Error retrieving dog data:", error);
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end("<h1>Error retrieving dog data</h1>");
            });
          });
        }).on("error", (error) => {
          console.error("Error retrieving stock data:", error);
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end("<h1>Error retrieving stock data</h1>");
        });
      }
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>404 Not Found.</h1>");
  }
}



function processAPIResponses(stockQuotes, dogImage) {
  let response = "";
  if (stockQuotes && stockQuotes.length > 0) {
    response += `
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th>Price</th>
            <th>Change</th>
            <th>Change Percent</th>
            <th>  Day Low </th>
            <th>  Year High  </th>
            <th> Exchange  </th>
            <th> Open </th>
            <th> Dog Image </th>
          </tr>
        </thead>
        <tbody>`;

    stockQuotes.forEach((quote) => {
      const symbol = quote.symbol;
      const name = quote.name;
      const price = quote.price;
      const change = quote.change;
      const changePercent = quote.changesPercentage;
      const dayLow = quote.dayLow;
      const yearHigh = quote.yearHigh;
      const exchange = quote.exchange;
      const open = quote.open;



      const formattedStockData = `
          <tr>
            <td>${symbol}</td>
            <td>${name}</td>
            <td>${price}</td>
            <td>${change}</td>
            <td>${changePercent}</td>
            <td>${dayLow}</td>
            <td>${yearHigh}</td>
            <td>${exchange}</td>
            <td>${open}</td>
            <td><img src="${dogImage}" alt="Dog Image" width="190"></td>
          </tr>`;
      response += formattedStockData;


    });


    response += `
        </tbody>
      </table>`;
  } else {
    response = "No stock quotes found.";
  }
  return response;
}


server.on("listening", listening_handler);
function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}
server.listen(port);
