import React, { useState, useEffect, useRef } from 'react';
import { ForceGraph3D } from 'react-force-graph'
import { Spinner, Card, Form, Col, Image, Badge, Table } from 'react-bootstrap'

import './App.css';
import 'bootstrap/dist/css/bootstrap.css';

const BLACK = '#000000'
const YELLOW = '#FF4500'
const COLORS = ['#7BD5F5', '#787FF6', '1F2F98']

function App() {
  let graph = useRef(null);
  let search = useRef(null);

  const [rawStamps, setRawStamps] = useState(null)
  const [graphData, setGraphData] = useState(null)
  const [hideProtocolConnections, setHideProtocolConnections] = useState(true)
  const [focusedNode, setFocusedNode] = useState(null)
  const [nodesMap, setNodesMap] = useState(new Map())
  const [metadata, setMetadata] = useState(null)

  async function fetchStampData() {
    let response = await fetch('https://api.thegraph.com/subgraphs/name/jamiepinheiro/crypto-stamps-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `
      {
        stamps(first: 1000, skip:1000) {
          id
          metadataURI
          ownerships {
            start
            end
            user {
              id
            }
          }
        }
      }`
      }),
    });
    const stamps = (await response.json()).data.stamps;
    setRawStamps(stamps)
  }

  async function updateGraphData() {
    if (!rawStamps) {
      return
    }
    let users = new Set();
    let nodes = []
    let links = []

    const blacklist = new Set(['0x23ba98addef64e1fdbdacee2293cbfd5f3d5e7ab'])

    rawStamps.forEach(stamp => {
      nodes.push({
        id: stamp.id,
        color: COLORS[1],
        normalColor: COLORS[1],
        name: stamp.id,
        val: 3,
        stamp: true,
        metadataURI: stamp.metadataURI
      })
      stamp.ownerships.forEach(ownership => {
        if (!hideProtocolConnections || !blacklist.has(ownership.user.id)) {
          users.add(ownership.user.id)
          links.push({
            source: ownership.user.id,
            target: stamp.id,
            color: ownership.end ? COLORS[1] : BLACK,
            normalColor: ownership.end ? COLORS[1] : BLACK,
            start: ownership.start,
            end: ownership.end
          })
        }
      });
    });
    nodes = nodes.concat(Array.from(users).map(id => { 
      return {
        id, 
        color: COLORS[2],
        normalColor: COLORS[2],
        name: id, 
        val: 10,
        stamp: false
      }
    }))

    nodes.forEach(n => nodesMap.set(n.id, n))
    setNodesMap(nodesMap)

    const graphData = { nodes, links };
    setGraphData(graphData);
  }

  async function getMetadata() {
    setMetadata(null)
    let node = nodesMap.get(focusedNode)
    let uri = node.metadataURI

    if (uri) {
      let response = await fetch(uri, { method: 'GET'})
      const metadata = (await response.json())
      setMetadata(metadata)
    } else {
      let metadata = {ownedStamps: [], previouslyOwnedStamps: []}
      graphData.links.forEach(l => {
        if (l.source.id === node.id) {
          if (l.source.end) {
            metadata.previouslyOwnedStamps.push(l.target.id)
          } else {
            metadata.ownedStamps.push(l.target.id)
          }
        }
      });
      setMetadata(metadata)
    }
  }

  useEffect(() => {
    if (graphData) {
      search.current.value = focusedNode
      let nodes = graphData.nodes
      let links = graphData.links
      nodes.forEach(n => n.color = focusedNode === n.id ? YELLOW : n.normalColor)
      links.forEach(l => {
        l.color = (focusedNode === l.target.id || focusedNode === l.source.id) ? YELLOW : l.normalColor
      })
      setGraphData({ nodes, links })
      if (focusedNode) {
        getMetadata()
      }
    }
  }, [focusedNode])

  useEffect(() => {
    updateGraphData();
  }, [rawStamps, hideProtocolConnections]);

  useEffect(() => {
    fetchStampData();
  }, [])

  function handleSubmit(event) {
    event.preventDefault();
    if (nodesMap.has(search.current.value)) {
      setFocusedNode(search.current.value)
    }
  }

  return (
    (
      graphData ?
      <div className='h-100'>
        <div className='layer col-3 h-100'>
          <Card className='col-8 mt-4'>
            <Card.Body>
              <Card.Title>Graph Settings</Card.Title>
              <Form>
                <Form.Row className='align-items-center'>
                  <Form.Check defaultChecked={true} label='Hide Central Minting Addresses' onChange={e => setHideProtocolConnections(e.target.checked)}/>
                </Form.Row>
              </Form>
              <hr/>
              <h5>Legend</h5>
              <Table borderless hover size="sm">
                <tbody>
                  <tr>
                    <td style={{color: COLORS[1]}}>●</td>
                    <td>Ethereum Account</td>
                  </tr>
                  <tr>
                    <td style={{color: COLORS[2]}}>●</td>
                    <td>Crypto Stamp Token</td>
                  </tr>
                  <tr>
                    <td>━━━━━</td>
                    <td>Currently Owns Connection</td>
                  </tr>
                  <tr>
                    <td style={{color: COLORS[1]}}>━━━━━</td>
                    <td>Previously Owned Connection</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          <Card className='col-8 mt-4'>
            <Card.Body>
              <Card.Title>Find a Node</Card.Title>
              <Form onSubmit={handleSubmit}>
                <Form.Row className='align-items-center'>
                  <Col className='p-0'>
                    <Form.Label htmlFor='inlineFormInput' srOnly>
                      Token Id or Eth Address
                    </Form.Label>
                    <Form.Control
                      ref={search}
                      className='mb-2'
                      id='nodeId'
                      placeholder='Stamp Id or Eth Address'
                    />
                  </Col>
                </Form.Row>
              </Form>
              <hr/>
              {focusedNode ?
                (
                  nodesMap.get(focusedNode).stamp ?
                    <div>
                      {metadata ?
                        <div>
                          <Image className='col-12 text-center mx-auto' src={metadata.image} fluid/>
                          <Badge  variant="info">Stamp Node</Badge>
                          <h4>{metadata.name}</h4>
                          <p>{metadata.description}</p>
                        </div>
                      : 
                        <Spinner className='mt-5' animation='border' />
                      }
                    </div>
                    :
                    <div>
                      <Badge variant="info">Ethereum Address</Badge>
                      <br></br>
                      <a href={`https://etherscan.io/address/${focusedNode}`} target='_blank'>view on etherscan.io</a>
                      {JSON.stringify(metadata)}
                    </div>
                )
                :
                ""
              }
            </Card.Body>
          </Card>
        </div>
        <div className='background'>
          <ForceGraph3D
            ref={graph}
            graphData={graphData}
            backgroundColor={'#CCCCDD'}
            onNodeClick={node => {
              setFocusedNode(node.id)
              const distance = 400;
              const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

              graph.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                node, // lookAt ({ x, y, z })
                3000  // ms transition duration
              );
              //graph.current.zoomToFit(1000, 10, i => i.id === focusedNode)
            }}
            onBackgroundClick={() => setFocusedNode(null)}
          />
        </div>
      </div>
      :
      <div className='col-12 text-center mt-5'>
        <Spinner className='mt-5' animation='border' />
        <p>fetching data...</p>
      </div>
    )
  );
}

export default App;
