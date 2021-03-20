import React, { useState, useEffect } from 'react';

import { ForceGraph3D } from 'react-force-graph'
import './App.css';

function App() {
  const [graphData, setGraphData] = useState(null)

  useEffect(() => {
    async function fetchData() {
      let response = await fetch('https://api.thegraph.com/subgraphs/name/jamiepinheiro/crypto-stamps-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `
        {
          stamps(first: 1000, skip:1000) {
            id
            metadataURI
            ownerships {
              user {
                id
              }
            }
          }
        }`
        }),
      });
      const stamps = (await response.json()).data.stamps;

      let users = new Set();
      let nodes = []
      let links = []

      const blacklist = new Set(["0x23ba98addef64e1fdbdacee2293cbfd5f3d5e7ab"])

      stamps.forEach(stamp => {
        nodes.push({id: stamp.id, group: 0, label: stamp.id})
        stamp.ownerships.forEach(ownership => {
          if (!blacklist.has(ownership.user.id)) {
            users.add(ownership.user.id)
            links.push({source: ownership.user.id, target: stamp.id})
          }
        });
      });
      nodes = nodes.concat(Array.from(users).map(id => { return {id, group: 1, label: id}}))

      const graphData = { nodes, links };
      console.log(graphData);
      setGraphData(graphData);
    }

    fetchData();
  }, []);

  return (
    (graphData ?
    <ForceGraph3D
      graphData={graphData}
      nodeAutoColorBy={'group'}
      nodeLabel={'label'}
      onNodeClick={n => alert(n.label)}
    />
    :
    <h1>loading...</h1>)
  );
}

export default App;
