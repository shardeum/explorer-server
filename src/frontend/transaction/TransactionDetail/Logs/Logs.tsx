import Link from 'next/link'
import React from 'react'
import { Button, Dropdown } from '../../../components'
import { Transaction } from '../../../types'

import styles from './Logs.module.scss'

interface LogsProps {
  transaction: Transaction
}

export const Logs: React.FC<LogsProps> = ({ transaction }) => {
  // TODO: can't find the data
  return (
    <div className={styles.Logs}>
      {transaction &&
        transaction?.wrappedEVMAccount?.readableReceipt?.logs &&
        transaction?.wrappedEVMAccount?.readableReceipt?.logs.map((log: any) => (
          <div className={styles.logItem}>
            <Button apperance="outlined" className={styles.count}>
              {log.logIndex}
            </Button>
            <div>
              <div className={styles.item}>
                <div className={styles.title}>Address</div>
                <Link href="/account/123" className={styles.link}>
                  {log.address}
                </Link>
              </div>
              <div className={styles.item}>
                <div className={styles.title}>Topic</div>
                <div>
                  {log.topics &&
                    log.topics.map((topic: any, index: any) => (
                      <div className={styles.row}>
                        <Button apperance="outlined" className={styles.btn}>
                          {index}
                        </Button>
                        <Dropdown
                          items={['Dec', 'Hex']}
                          apperance="outlined"
                          buttonClassName={styles.dropdown}
                        />
                        <Link href="/contract/123" className={styles.link}>
                          {topic}
                        </Link>
                      </div>
                    ))}
                </div>
              </div>
              <div className={styles.item}>
                <div className={styles.title}>Data</div>
                <Link href="/account/123" className={styles.link}>
                  {log.data}
                </Link>
              </div>
            </div>
          </div>
        ))}
      {/* <div className={styles.logItem}>
        <Button apperance="outlined" className={styles.count}>
          280
        </Button>
        <div>
          <div className={styles.item}>
            <div className={styles.title}>Address</div>
            <Link href="/account/123" className={styles.link}>
              0x0b91b07beb67333225a5ba0259d55aee10e3a578
            </Link>
          </div>
          <div className={styles.item}>
            <div className={styles.title}>Topic</div>
            <div>
              <div className={styles.row}>
                <Button apperance="outlined" className={styles.btn}>
                  0
                </Button>
                <Dropdown
                  items={["Dec", "Hex"]}
                  apperance="outlined"
                  buttonClassName={styles.dropdown}
                />
                <Link href="/contract/123" className={styles.link}>
                  0x00000000000000000000000000d71f398f7a20910109c6a455efd4c2612ef9e9
                </Link>
              </div>
              <div className={styles.row}>
                <Button apperance="outlined" className={styles.btn}>
                  1
                </Button>
                <Dropdown
                  items={["Hex", "Dec"]}
                  apperance="outlined"
                  buttonClassName={styles.dropdown}
                />
                <Link href="/contract/123" className={styles.link}>
                  0x00000000000000000000000000d71f398f7a20910109c6a455efd4c2612ef9e9
                </Link>
              </div>
              <div className={styles.row}>
                <Button apperance="outlined" className={styles.btn}>
                  2
                </Button>
                <Dropdown
                  items={["Hex", "Dec"]}
                  apperance="outlined"
                  buttonClassName={styles.dropdown}
                />
                <Link href="/contract/123" className={styles.link}>
                  0x00000000000000000000000000d71f398f7a20910109c6a455efd4c2612ef9e9
                </Link>
              </div>
            </div>
          </div>
          <div className={styles.item}>
            <div className={styles.title}>Data</div>
            <Link href="/account/123" className={styles.link}>
              115792089237316195423570985008687907853269984665640564039457584007913129639935
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.logItem}>
        <Button apperance="outlined" className={styles.count}>
          280
        </Button>
        <div>
          <div className={styles.item}>
            <div className={styles.title}>Address</div>
            <Link href="/account/123" className={styles.link}>
              0x0b91b07beb67333225a5ba0259d55aee10e3a578
            </Link>
          </div>
          <div className={styles.item}>
            <div className={styles.title}>Topic</div>
            <div>
              <div className={styles.row}>
                <Button apperance="outlined" className={styles.btn}>
                  0
                </Button>
                <Dropdown
                  items={["Dec", "Hex"]}
                  apperance="outlined"
                  buttonClassName={styles.dropdown}
                />
                <Link href="/contract/123" className={styles.link}>
                  0x00000000000000000000000000d71f398f7a20910109c6a455efd4c2612ef9e9
                </Link>
              </div>
              <div className={styles.row}>
                <Button apperance="outlined" className={styles.btn}>
                  1
                </Button>
                <Dropdown
                  items={["Hex", "Dec"]}
                  apperance="outlined"
                  buttonClassName={styles.dropdown}
                />
                <Link href="/contract/123" className={styles.link}>
                  0x00000000000000000000000000d71f398f7a20910109c6a455efd4c2612ef9e9
                </Link>
              </div>
              <div className={styles.row}>
                <Button apperance="outlined" className={styles.btn}>
                  2
                </Button>
                <Dropdown
                  items={["Hex", "Dec"]}
                  apperance="outlined"
                  buttonClassName={styles.dropdown}
                />
                <Link href="/contract/123" className={styles.link}>
                  0x00000000000000000000000000d71f398f7a20910109c6a455efd4c2612ef9e9
                </Link>
              </div>
            </div>
          </div>
          <div className={styles.item}>
            <div className={styles.title}>Data</div>
            <Link href="/account/123" className={styles.link}>
              115792089237316195423570985008687907853269984665640564039457584007913129639935
            </Link>
          </div>
        </div>
      </div> */}
    </div>
  )
}
