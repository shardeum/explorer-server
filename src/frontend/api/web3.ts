import Web3 from 'web3'

export const getWeb3 = function (): Promise<Web3> {
  return new Promise((resolve, reject) => {
    try {
      const web3 = new Web3(new Web3.providers.HttpProvider(`http://localhost:8080`))
      resolve(web3)
    } catch (e) {
      console.error(e)
      reject('Cannot get web3 instance')
    }
  })
}
