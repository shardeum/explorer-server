/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ArchivedCycles {
  archivedCycles: any[]
  sign: {
    owner: string
    sig: string
  }
}

export interface ArchivedReceipts {
  receipts: any[]
  cycles: any[]
  sign: {
    owner: string
    sig: string
  }
}
