import { db, businessesTable, reportsTable } from "@workspace/db";

const BUSINESSES = [
  { name: "Nova Tower Real Estate", city: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, sector: "Real Estate", status: "active", managerName: "Ahmed Al-Rashid", managerEmail: "ahmed@novatower.ae", description: "Premium property development and leasing in Dubai" },
  { name: "TechCore Solutions", city: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, sector: "Technology", status: "active", managerName: "Li Wei", managerEmail: "liwei@techcore.sg", description: "B2B software solutions for Southeast Asian markets" },
  { name: "Atlantic Shipping Co.", city: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, sector: "Logistics", status: "active", managerName: "James Harrington", managerEmail: "james@atlanticship.co.uk", description: "Global freight and supply chain management" },
  { name: "Vino Rosso Imports", city: "Milan", country: "Italy", lat: 45.4642, lng: 9.19, sector: "Food & Beverage", status: "active", managerName: "Marco Ferretti", managerEmail: "marco@vinorosso.it", description: "Premium wine import and distribution across Europe" },
  { name: "Pacific Growth Fund", city: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, sector: "Finance", status: "active", managerName: "Yuki Tanaka", managerEmail: "yuki@pacificgrowth.jp", description: "Venture capital and private equity in Asia-Pacific" },
  { name: "Green Agro Brasil", city: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, sector: "Agriculture", status: "active", managerName: "Carlos Mendes", managerEmail: "carlos@greenagro.br", description: "Sustainable agriculture and soy exportation" },
  { name: "Nordic Clean Energy", city: "Stockholm", country: "Sweden", lat: 59.3293, lng: 18.0686, sector: "Energy", status: "active", managerName: "Erik Lindstrom", managerEmail: "erik@nordicclean.se", description: "Wind and solar energy infrastructure in Scandinavia" },
  { name: "Sahara Mining Group", city: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, sector: "Mining", status: "active", managerName: "Omar Khalil", managerEmail: "omar@saharamining.eg", description: "Gold and mineral extraction operations" },
  { name: "Velocity Auto Group", city: "New York", country: "USA", lat: 40.7128, lng: -74.006, sector: "Automotive", status: "active", managerName: "Rachel Stone", managerEmail: "rachel@velocityauto.us", description: "Luxury car dealership network on the East Coast" },
  { name: "Horizon Hotels Asia", city: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018, sector: "Hospitality", status: "active", managerName: "Priya Sharma", managerEmail: "priya@horizonhotels.asia", description: "Boutique hotel chain across Southeast Asia" },
];

// Monthly revenue/profit/orders per business (index-matched to BUSINESSES above)
const MONTHLY_REPORTS = [
  { revenue: 2100000, orders: 72, profit: 645271 },
  { revenue: 1150000, orders: 340, profit: 483480 },
  { revenue: 3200000, orders: 220, profit: 1146761 },
  { revenue: 450000, orders: 1250, profit: 132498 },
  { revenue: 5600000, orders: 168, profit: 1680088 },
  { revenue: 2480000, orders: 580, profit: 985479 },
  { revenue: 1720000, orders: 112, profit: 486007 },
  { revenue: 9600000, orders: 56, profit: 3045533 },
  { revenue: 3920000, orders: 488, profit: 1306622 },
  { revenue: 720000, orders: 960, profit: 261898 },
];

async function seed() {
  console.log("Seeding businesses...");

  for (let i = 0; i < BUSINESSES.length; i++) {
    const biz = BUSINESSES[i];
    const report = MONTHLY_REPORTS[i];

    // Insert business
    const { sector, ...bizRest } = biz;
    const [inserted] = await db
      .insert(businessesTable)
      .values({ ...bizRest, industry: sector, managerId: 0 })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      console.log(`  Skipped (already exists): ${biz.name}`);
      continue;
    }

    console.log(`  Created: ${biz.name} (id=${inserted.id})`);

    const today = new Date().toISOString().slice(0, 10);

    // Insert month/week/day reports
    await db.insert(reportsTable).values([
      { businessId: inserted.id, period: "month", revenue: report.revenue, orders: report.orders, profit: report.profit, date: today },
      { businessId: inserted.id, period: "week", revenue: Math.round(report.revenue * 0.25), orders: Math.round(report.orders * 0.25), profit: Math.round(report.profit * 0.25), date: today },
      { businessId: inserted.id, period: "day", revenue: Math.round(report.revenue * 0.04), orders: Math.round(report.orders * 0.04), profit: Math.round(report.profit * 0.04), date: today },
    ]).onConflictDoNothing();
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
