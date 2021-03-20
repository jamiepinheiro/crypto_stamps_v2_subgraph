import React, { useState, useEffect } from 'react';

import { ForceGraph3D } from 'react-force-graph'
import './App.css';

function App() {
  const [graphData, setGraphData] = useState(null)

  useEffect(() => {
    async function fetchData() {
      let response = await fetch('https://api.thegraph.com/subgraphs/name/jamiepinheiro/nftweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `
          {
            users (first: 10) {
              id
            }
          }`
        }),
      });
      const users = (await response.json()).data.users;

      let tweets = [];
      let ownerships = [];

      for (let i = 0; i < 3; i++ ) {
        response = await fetch('https://api.thegraph.com/subgraphs/name/jamiepinheiro/nftweet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `
            {
              tweets (first: 1000, skip: ${i * 1000}) {
                id
                tweetID
                metadataURI
              }
            }`
          }),
        });
        tweets = tweets.concat((await response.json()).data.tweets);

        response = await fetch('https://api.thegraph.com/subgraphs/name/jamiepinheiro/nftweet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `
            {
              ownerships (first: 1000, skip: ${i * 1000}) {
                id
                tweet {
                  id
                }
                user {
                  id
                }
                start
                end
              }
            }`
          }),
        });
        ownerships = ownerships.concat((await response.json()).data.ownerships);
      }

      const nodes = tweets.map(t => {return {id: t.id}}).concat(users.concat(u => {return {id: u.id} }));
      const ids = new Set(nodes.map(i => i.id));

      const links = ownerships.map(o => {return {source: o.user.id, target: o.tweet.id}}).filter(l => ids.has(l.source) && ids.has(l.target));

      console.log(nodes, links);

      const graphData = { nodes, links };

      setGraphData(graphData);
    }

    fetchData();
  }, []);

  return (
    (graphData ?
    <ForceGraph3D
      graphData={graphData}
    />
    :
    <h1>loading...</h1>)
  );
}

export default App;
