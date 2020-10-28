/* @jsx jsx */
import {jsx} from '@emotion/core'

import React, {useState, useEffect} from 'react'
import {navigate, createHistory} from '@reach/router'
import netlify from 'netlify-auth-providers'
import {GraphQLClient} from 'graphql-request'
import {PrimaryButton} from './shared/pattern'

const GitHubClientContext = React.createContext()
const {Provider, Consumer} = GitHubClientContext

async function authWithGitHub() {
  return new Promise((resolve, reject) => {
    var authenticator = new netlify({
      site_id: process.env.REACT_APP_NETLIFY_SITE_ID,
    })
    authenticator.authenticate(
      {provider: 'github', scope: 'public_repo,read:org,read:user'},
      function(err, data) {
        if (err) {
          reject(err)
        }
        resolve(data)
      },
    )
  })
}

const history = createHistory(window)

function GitHubClientProvider(props) {
  const [error, setError] = useState(null);
  const [client, setClient] = useState(() => {
    if (props.client) {
      return props.client
    } else {
      const token = window.localStorage.getItem('github-token')
      if (token) {
        return getClient(token)
      }
    }
  })

  function getClient(token) {
    const headers = {Authorization: `bearer ${token}`}
    const client = new GraphQLClient('https://api.github.com/graphql', {
      headers,
    })
    return Object.assign(client, {
      login,
      logout,
    })
  }

  // useEffect is a combination between componentDidMount, componentWillUnmount and componentDidUpdate. Also, useEffect callback sometimes will run sometime after the render has happened and not synchronously. Whereas, componentDidMount will run synchronously right after the render has happened.
  // Hooks allows us to do our setup and tear down or cleanup in the same callback
  useEffect(() => {
    if (!client) {
      navigate('/')
    }
    const unsubscribeHistory = history.listen(() => {
      if (!client) {
        navigate('/')
      }
    })
    return function cleanup() {
      unsubscribeHistory();
    }
  }, [])

  const logout = () => {
    window.localStorage.removeItem('github-token')
    setClient(null);
    setError(null);
    navigate('/')
  }

  const login = async () => {
    const data = await authWithGitHub().catch(error => {
      console.log('Oh no', error)
      setError(error);
    })
    window.localStorage.setItem('github-token', data.token)
    setClient(getClient(data.token))
  }

  return client ? (
    <Provider value={client}>{props.children}</Provider>
  ) : (
    <div
      css={{
        marginTop: 250,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {error ? (
        <div>
          <p>Oh no! There was an error.</p>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : (
        <div>
          <PrimaryButton onClick={login}>
            Login with GitHub
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}

export {
  GitHubClientProvider as Provider,
  Consumer,
  GitHubClientContext as Context,
}

/*
eslint
no-unused-vars: ["warn", {"varsIgnorePattern": "(jsx)"}]
react/react-in-jsx-scope: "off"
*/
