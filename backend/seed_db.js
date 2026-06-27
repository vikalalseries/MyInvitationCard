const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const fs = require("fs");
const path = require("path");
const { connectDB } = require("./db");

const Template = require("./models/Template");

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully.");

    const count = await Template.countDocuments();
    console.log(`Current template count in DB: ${count}`);

    const templatesJsonPath = path.join(__dirname, "../data/templates.json");
    if (!fs.existsSync(templatesJsonPath)) {
      console.error("templates.json file not found at", templatesJsonPath);
      process.exit(1);
    }

    const templatesData = JSON.parse(fs.readFileSync(templatesJsonPath, "utf-8"));
    console.log(`Loaded ${templatesData.length} templates from templates.json.`);

    const templatesToInsert = templatesData.map(t => {
      const isPremium = t.category === "premium";

      // Pricing matched to Configure Print page (print.js recalculatePricing):
      // basePriceRate = ₹10.00 per card (base card stock)
      // Volume discount tiers: 100+=10% off, 150+=20% off, 300+=50% off
      // Paper add-ons: glossy +₹2, linen +₹5, metallic +₹8
      // Envelope add-ons: velvet +₹5, none -₹2
      const baseCardPrice = 10;  // ₹10.00 per card (print.js basePriceRate)
      const offerCardPrice = 8;  // ₹8.00 per card (20% volume discount at 150+ cards)

      return {
        templateId: String(t.id),
        name: t.title,
        category: t.event || "wedding",
        thumbnail: t.thumbnail || "",
        price: baseCardPrice,
        offerPrice: offerCardPrice,
        offerLabel: "Order 150+ Get 20% OFF",
        offerStartDate: null,
        offerEndDate: null,
        isFeatured: !!t.featured,
        isPremium: isPremium,
        status: "active",
        files: []
      };
    });

    // Clean existing collection to avoid key duplicates if any, or just upsert/insert
    // Let's do deleteMany and insertMany to make it a clean seed
    await Template.deleteMany({});
    console.log("Cleared existing templates in MongoDB.");

    const result = await Template.insertMany(templatesToInsert);
    console.log(`Successfully seeded ${result.length} templates into MongoDB.`);

    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

run();
