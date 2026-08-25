import { config } from "dotenv";
config({ path: ".env.local" }); // Load environment variables FIRST

// Use dynamic imports to ensure dotenv is loaded before modules that use DATABASE_URL
const { db } = await import("#/db")
const { auth } = await import("#/lib/auth")
const { eq, and } = await import("drizzle-orm")
const {
  organization,
  member,
  user: userTable,
  account,
  session: sessionTable,
  businesses,
  companies,
  banks,
  settings,
  clients,
  products
} = await import("#/db/schema")

async function main() {
  console.log("Seeding database...")

  // Check if organization already exists
  let [org] = await db.select().from(organization).where(eq(organization.slug, "spark-invoice-system")).limit(1)

  if (!org) {
    // Create default organization
    const [newOrg] = await db.insert(organization).values({
      name: "Spark Invoice System",
      slug: "spark-invoice-system",
      logo: "https://example.com/logo.png",
    }).returning()
    org = newOrg
    console.log("Created organization:", org.id)
  } else {
    console.log("Organization already exists:", org.id)
  }

  // Seed demo accounts — clinton@sparkafrica.co (admin) and ada@sparkafrica.co (editor), password 'spark'
  const demoUsers: Array<{ name: string; email: string; password: string; role: string }> = [
    { name: "Nnaemeka Clinton", email: "clinton@sparkafrica.co", password: "spark", role: "admin" },
    { name: "Ada Okonkwo", email: "ada@sparkafrica.co", password: "spark", role: "editor" },
    // Keep legacy admin for compatibility
    { name: "System Administrator", email: "admin@spark.com", password: "spark", role: "owner" },
  ]

  for (const u of demoUsers) {
    let dbUser
    const [existing] = await db.select().from(userTable).where(eq(userTable.email, u.email)).limit(1)
    if (!existing) {
      try {
        const res = await auth.api.signUpEmail({ body: { name: u.name, email: u.email, password: u.password } })
        dbUser = res.user
        console.log(`Created user ${u.email} via Better Auth:`, dbUser.id)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes("already exists") || msg.includes("exists")) {
          const [retry] = await db.select().from(userTable).where(eq(userTable.email, u.email)).limit(1)
          dbUser = retry
          console.log(`User ${u.email} already existed (race), using existing:`, dbUser?.id)
        } else throw e
      }
    } else {
      dbUser = existing
      console.log(`User ${u.email} already exists:`, dbUser.id)
      if (dbUser.name !== u.name) {
        await db.update(userTable).set({ name: u.name }).where(eq(userTable.id, dbUser.id))
      }
      // Ensure password is 'spark' — verify via signIn, recreate if mismatch (idempotent for demo)
      try {
        const test = (await auth.api.signInEmail({ body: { email: u.email, password: u.password }, headers: new Headers(), asResponse: false } as any)) as any
        if (!test?.user) throw new Error("signIn test failed")
        console.log(`Password for ${u.email} verified as '${u.password}'`)
      } catch {
        console.log(`Password for ${u.email} not '${u.password}', resetting…`)
        await db.delete(sessionTable).where(eq(sessionTable.userId, dbUser.id))
        await db.delete(account).where(eq(account.userId, dbUser.id))
        await db.delete(member).where(eq(member.userId, dbUser.id))
        await db.delete(userTable).where(eq(userTable.id, dbUser.id))
        const res = await auth.api.signUpEmail({ body: { name: u.name, email: u.email, password: u.password } })
        dbUser = res.user
        console.log(`Recreated ${u.email} with password '${u.password}':`, dbUser.id)
      }
    }
    if (!dbUser) continue
    await db.update(userTable).set({ emailVerified: true }).where(eq(userTable.id, dbUser.id))
    const [existingMember] = await db.select().from(member).where(
      and(eq(member.organizationId, org.id), eq(member.userId, dbUser.id))
    ).limit(1)
    if (!existingMember) {
      await db.insert(member).values({ organizationId: org.id, userId: dbUser.id, role: u.role })
      console.log(`Made ${u.email} member as ${u.role}`)
    } else if (existingMember.role !== u.role) {
      await db.update(member).set({ role: u.role }).where(
        and(eq(member.organizationId, org.id), eq(member.userId, dbUser.id))
      )
      console.log(`Updated ${u.email} role to ${u.role}`)
    } else {
      console.log(`Membership for ${u.email} already as ${u.role}`)
    }
  }

  // Create businesses
  const businessData = [
    { name: "New Business", prefix: "NB" },
    { name: "ASF", prefix: "ASF" },
    { name: "ATE", prefix: "ATE" }
  ]

  const existingBusinesses = await db.select().from(businesses).where(eq(businesses.organizationId, org.id))
  if (existingBusinesses.length === 0) {
    const businessesResult = await db.insert(businesses).values(
      businessData.map(b => ({ ...b, organizationId: org.id }))
    ).returning()
    console.log(`Created ${businessesResult.length} businesses`)
  } else {
    console.log(`Businesses already exist: ${existingBusinesses.length}`)
  }

  // Create companies (one per region)
  const companiesData = [
    {
      region: "Nigeria",
      name: "Spark Nigeria Ltd",
      reg: "RC 1234567",
      address: "123 Broad Street, Lagos, Nigeria",
      email: "nigeria@spark.com",
      phone: "+234 1 234 5678",
      tin: "12345678-0001",
      defaultCurrency: "NGN" as const,
      logo: "https://example.com/nigeria-logo.png"
    },
    {
      region: "Kenya",
      name: "Spark Kenya Ltd",
      reg: "PL 8901234",
      address: "456 Moi Avenue, Nairobi, Kenya",
      email: "kenya@spark.com",
      phone: "+254 20 123 4567",
      tin: "P051234567F",
      defaultCurrency: "KES" as const,
      logo: "https://example.com/kenya-logo.png"
    },
    {
      region: "Rwanda",
      name: "Spark Rwanda Ltd",
      reg: "RWC 5678901",
      address: "789 Kigali Boulevard, Kigali, Rwanda",
      email: "rwanda@spark.com",
      phone: "+250 788 123 456",
      tin: "100123456",
      defaultCurrency: "RWF" as const,
      logo: "https://example.com/rwanda-logo.png"
    }
  ]

  const existingCompanies = await db.select().from(companies).where(eq(companies.organizationId, org.id))
  if (existingCompanies.length === 0) {
    const companiesResult = await db.insert(companies).values(
      companiesData.map(c => ({ ...c, organizationId: org.id }))
    ).returning()
    console.log(`Created ${companiesResult.length} companies`)
  } else {
    console.log(`Companies already exist: ${existingCompanies.length}`)
  }

  // Create banks for each company
  const banksData: Array<{
    organizationId: string
    currency: "NGN" | "KES" | "RWF"
    label: string
    fields: [string, string][]
  }> = [
    // Nigeria banks (NGN)
    {
      organizationId: org.id,
      currency: "NGN",
      label: "GTBank - Corporate Account",
      fields: [["Account Number", "0123456789"], ["Bank Code", "GTB"]]
    },
    {
      organizationId: org.id,
      currency: "NGN",
      label: "Access Bank - Savings",
      fields: [["Account Number", "0098765432"], ["Bank Code", "044"]]
    },
    // Kenya banks (KES)
    {
      organizationId: org.id,
      currency: "KES",
      label: "Equity Bank - Main Account",
      fields: [["Account Number", "0120304050"], ["Bank Code", "EQBK"]]
    },
    {
      organizationId: org.id,
      currency: "KES",
      label: "KCB Bank - Operations",
      fields: [["Account Number", "1122334455"], ["Bank Code", "KCB"]]
    },
    // Rwanda banks (RWF)
    {
      organizationId: org.id,
      currency: "RWF",
      label: "Bank of Kigali - Corporate",
      fields: [["Account Number", "5566778899"], ["Bank Code", "BKIG"]]
    },
    {
      organizationId: org.id,
      currency: "RWF",
      label: "I&M Bank - Rwanda",
      fields: [["Account Number", "9988776655"], ["Bank Code", "IMB"]]
    }
  ]

  const existingBanks = await db.select().from(banks).where(eq(banks.organizationId, org.id))
  if (existingBanks.length === 0) {
    const banksResult = await db.insert(banks).values(banksData).returning()
    console.log(`Created ${banksResult.length} banks`)
  } else {
    console.log(`Banks already exist: ${existingBanks.length}`)
  }

  // Create FX rates in settings
  const existingFxRates = await db.select().from(settings).where(
    and(eq(settings.organizationId, org.id), eq(settings.key, "fx-rates"))
  ).limit(1)

  if (existingFxRates.length === 0) {
    const fxRates = {
      base: "USD",
      rates: {
        NGN: 1450.50,
        KES: 130.75,
        RWF: 1250.25,
        EUR: 0.85,
        GBP: 0.73,
      },
      updatedAt: new Date().toISOString()
    }

    await db.insert(settings).values({
      organizationId: org.id,
      key: "fx-rates",
      value: fxRates
    })
    console.log("Created FX rates settings")
  } else {
    console.log("FX rates settings already exist")
  }

  // Create sample clients
  const clientsData = [
    {
      organizationId: org.id,
      name: "ABC Trading Company Ltd",
      reg: "RC 9876543",
      address: "789 Trade Fair Complex, Lagos, Nigeria",
      email: "info@abctrading.com.ng",
      contact: "+234 803 123 4567",
      notes: "Regular customer for office supplies"
    },
    {
      organizationId: org.id,
      name: "East Africa Logistics",
      reg: "LC 4567890",
      address: "Industrial Area, Nairobi, Kenya",
      email: "ops@ealogistics.co.ke",
      contact: "+254 722 987 654",
      notes: "Shipping and logistics partner"
    },
    {
      organizationId: org.id,
      name: "Kigali Construction Ltd",
      reg: "RWC 1122334",
      address: "KG 12 Ave, Kigali, Rwanda",
      email: "info@kcc.rw",
      contact: "+250 788 555 123",
      notes: "Building materials supplier"
    }
  ]

  const existingClients = await db.select().from(clients).where(eq(clients.organizationId, org.id))
  if (existingClients.length === 0) {
    const clientsResult = await db.insert(clients).values(clientsData).returning()
    console.log(`Created ${clientsResult.length} clients`)
  } else {
    console.log(`Clients already exist: ${existingClients.length}`)
  }

  // Create sample products/services
  const productsData: Array<{
    organizationId: string
    name: string
    description: string
    cost: string
    currency: "NGN"
  }> = [
    {
      organizationId: org.id,
      name: "Professional Consulting Services",
      description: "Hourly consulting services for business strategy and operations",
      cost: "50000.00",
      currency: "NGN"
    },
    {
      organizationId: org.id,
      name: "Software Development",
      description: "Custom software development and maintenance",
      cost: "75000.00",
      currency: "NGN"
    },
    {
      organizationId: org.id,
      name: "Training Workshop",
      description: "One-day training workshop for teams",
      cost: "200000.00",
      currency: "NGN"
    },
    {
      organizationId: org.id,
      name: "Website Design",
      description: "Professional website design and development",
      cost: "300000.00",
      currency: "NGN"
    },
    {
      organizationId: org.id,
      name: "Data Analysis Report",
      description: "Comprehensive data analysis and reporting service",
      cost: "150000.00",
      currency: "NGN"
    }
  ]

  const existingProducts = await db.select().from(products).where(eq(products.organizationId, org.id))
  if (existingProducts.length === 0) {
    const productsResult = await db.insert(products).values(productsData).returning()
    console.log(`Created ${productsResult.length} products/services`)
  } else {
    console.log(`Products already exist: ${existingProducts.length}`)
  }

  console.log("Database seeding completed successfully!")
}

main()
  .catch((e: unknown) => {
    console.error("Seeding failed:", e)
    process.exit(1)
  })
