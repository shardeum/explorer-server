/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Data {
  archivedCycles: any[]
  sign: {
    owner: string
    sig: string
  }
}

export interface NewData {
  receipts: any[]
  cycles: any[]
  sign: {
    owner: string
    sig: string
  }
}
