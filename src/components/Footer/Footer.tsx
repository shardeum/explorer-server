import Link from "next/link";
import ReactTooltip from "react-tooltip";

import { Icon, iconTypes } from "../Icon";
import { Spacer } from "../Spacer";

import styles from "./Footer.module.scss";

const company = [
  { href: "", label: "About Us" },
  { href: "", label: "Contact Us" },
  { href: "", label: "Brand Assets" },
  { href: "", label: "Careers Join Us" },
  { href: "", label: "Terms of Service" },
  { href: "", label: "Bug Bounty" },
];

const resources = [
  { href: "", label: "API Documentation" },
  { href: "", label: "Knowledge Base" },
  { href: "", label: "Newsletter" },
  { href: "", label: "Network Status" },
];

const socials = [
  { iconName: "twitter", title: "Twitter", href: "https://www.twitter.com" },
  { iconName: "facebook", title: "Facebook", href: "https://www.facebook.com" },
  { iconName: "medium", title: "Medium", href: "https://www.medium.com" },
  { iconName: "reddit", title: "Reddit", href: "https://www.reddit.com" },
];

export const Footer: React.FC = () => {
  return (
    <div className={styles.Footer}>
      <div className={styles.main}>
        <div>
          <div className={styles.logoItem}>
            <Icon name="logo" className={styles.icon} size="large" />
            <div className={styles.name}>
              Powered by <span>Shardeum</span>
            </div>
          </div>
          <Spacer space="16" />
          <div className={styles.label}>
            Shardeum is an EVM-based, linearly scalable smart contract platform that provides low gas fees forever while maintaining true decentralization and solid security through dynamic state sharding.
          </div>
        </div>
        <div></div>
        <div>
          <div className={styles.title}>Company</div>
          <hr />
          {company.map((item, index) => (
            <div key={`${index}-${item.label}`}>
              <Link href={item.href} className={styles.link}>
                {item.label}
              </Link>
              <Spacer space="8" />
            </div>
          ))}
        </div>
        <div>
          <div className={styles.title}>Resources</div>
          <hr />
          {resources.map((item, index) => (
            <div key={`${index}-${item.label}`}>
              <Link href={item.href} className={styles.link}>
                {item.label}
              </Link>
              <Spacer space="8" />
            </div>
          ))}
        </div>
      </div>
      <hr />
      <div className={styles.social}>
        <div>
          <span>Shardeum</span> © 2023
        </div>
        <div className={styles.wrapper}>
          {socials.map((social, index) => (
            <a
              key={`${index}-${social.iconName}`}
              target="_blank"
              href={social.href}
              rel="noopener noreferrer"
              className={styles.socialBtn}
              data-tip={social.title}
              data-for="fsb"
            >
              <Icon name={social.iconName as keyof typeof iconTypes} color="black" />
            </a>
          ))}
          <ReactTooltip effect="solid" backgroundColor="#3498db" id="fsb" />
        </div>
      </div>
    </div>
  );
};
