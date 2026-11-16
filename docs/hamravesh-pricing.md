# Hamravesh — services and pricing check

**Date checked:** 16 Nov 2026. **Companion to:** [`production-architecture.md`](production-architecture.md) (section 12, monthly cost estimates).

## How reliable this is

The site itself could not be opened. `hamravesh.com` does not answer connections from the cloud machine this review ran on: the connection opens and the site never replies. That usually means the site only serves visitors inside Iran, though the cause could not be confirmed.

Every price below therefore comes from **search-engine snippets of Hamravesh's own pages**, not from the live pages. Hamravesh's changelog mentions a tariff update from Khordad 1405; it could not be confirmed whether the snippet figures are from before or after it. **Re-check on the live pricing page before budgeting.**

## What Hamravesh sells

| Product | What it is | Price found? |
|---|---|---|
| **Darkube** | A Kubernetes-based platform: you deploy containers without managing servers. PostgreSQL, Redis and MinIO (S3-compatible storage) can be created from its panel | Yes — table below |
| **Managed database** | A separate database service with its own pricing. A blog post says the launch discount (60%) ended for new users in Azar 1403 | No current prices found |
| **Managed Kubernetes** | A dedicated cluster for an organisation | No — appears to be priced on request |
| **Dedicated load balancer** | Billed hourly, pay-as-you-go | No |
| **Backup service** | Exists (covered in a Hamravesh blog post) | No |

Data centres: Iran and Germany, priced separately.

## Darkube prices

Pay-as-you-go, billed hourly. Monthly figures are for a 30-day month (720 hours); 29- and 31-day months cost slightly less or more.

| Resource | Iran data centre | Germany data centre |
|---|---|---|
| 1 vCore | 826 T/hour ≈ 595,000 T/month | 1,375 T/hour ≈ 990,000 T/month |
| 1 GB RAM | 403 T/hour ≈ 290,000 T/month | 667 T/hour ≈ 480,000 T/month |
| 1 GB SSD | 23 T/hour ≈ 16,500 T/month | 44 T/hour ≈ 32,000 T/month |

T = Toman. Whether VAT is included is not known.

## What the three levels would cost on Hamravesh

Recommended configurations from `production-architecture.md` (sections 11.2–11.4), Iran data centre, converted at ≈ 266,000 T per USD (free-market rate on 16 Nov 2026; volatile).

| Level | Resources | CPU | RAM | SSD | Total per month |
|---|---|---:|---:|---:|---:|
| 1 | 10 vCPU, 20 GB RAM, 250 GB SSD | 5.95 M T | 5.80 M T | 4.13 M T | **≈ 15.9 M T (≈ $60)** |
| 2 | 62 vCPU, 188 GB RAM, 1,800 GB SSD | 36.9 M T | 54.5 M T | 29.7 M T | **≈ 121 M T (≈ $455)** |
| 3 | 410 vCPU, 1,852 GB RAM, 15,000 GB SSD | 244 M T | 537 M T | 248 M T | **≈ 1.03 B T (≈ $3,870)** |

**Not included:** traffic, load balancer, backups, object storage, and any premium for the managed database service over raw Darkube resources.

These totals fall inside the ranges already given in `production-architecture.md` section 12.2 (Level 1 $50–85, Level 2 $400–600, Level 3 $3,300–4,800), so that report does not need changing.

## Points to note for our architecture

- **RAM is the main cost at Levels 2 and 3** (45–52% of the total), driven by the database nodes. Sizing the database from load-test measurements rather than the planning tables is the largest saving available.
- **Use the Iran data centre.** The Germany data centre costs about 65–95% more and would be unreachable for customers during an international connectivity cut.
- **Level 3 database machines** (32 vCPU / 256 GB) may exceed what a container platform offers per instance; this needs asking Hamravesh directly.
- **An incident is on record:** Hamravesh published a report on a general outage of its `c13` zone on 10 Farvardin 1405. Keep backups at a second provider, as the main report recommends.

## Still to confirm on the live site

1. Current prices after the Khordad 1405 tariff update.
2. Managed PostgreSQL and Redis prices and available sizes.
3. Traffic / bandwidth price.
4. Load balancer and backup service prices.
5. Largest instance size available; whether dedicated nodes are offered.
6. Whether prices include VAT.

## Sources

- [Hamravesh pricing](https://hamravesh.com/pricing)
- [Hamravesh home](https://hamravesh.com/)
- [Darkube](https://hamravesh.com/darkube)
- [Darkube docs](https://docs.hamravesh.com/products/darkube)
- [Managed database pricing change (blog)](https://hamravesh.com/blog/dbaas-pricing-update/)
- [Managed database](https://hamravesh.com/managed-database)
- [Managed Kubernetes](https://hamravesh.com/managed-kubernetes)
- [Dedicated load balancer docs](https://docs.hamravesh.com/products/loadbalancer)
- [Changelog](https://docs.hamravesh.com/changelog)
- [c13 zone incident report (blog)](https://hamravesh.com/blog/c13-zone-disaster-report-1405/)
