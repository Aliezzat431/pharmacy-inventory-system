import mongoose from 'mongoose';

/**
 * Run:
 * node --env-file=.env reset-and-seed-100-egypt-simple-numeric-barcodes.mjs
 */

const MONGODB_URI =
  'mongodb+srv://Aliezzat:Aliezzat%402026@cluster0.valdepj.mongodb.net/pharmacy-stock';

// ============================================================
// 🔥 Schema Definition
// ============================================================
const BatchSchema = new mongoose.Schema(
  {
    batchNumber: { type: String, required: true },
    barcode: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true, default: 0 },
    purchasePrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    purchaseDate: { type: Date, default: Date.now },
    supplier: { type: String },
    invoiceNumber: { type: String },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { _id: true, timestamps: true }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    unit: { type: String, required: true },
    unitConversion: { type: Number, default: 1 },
    company: { type: String, required: true },
    details: { type: String, default: '' },
    unitOptions: [{ type: String }],
    isBaseUnit: { type: Boolean, default: false },
    batches: [BatchSchema],
    inventoryMethod: {
      type: String,
      enum: ['FEFO', 'FIFO', 'LIFO'],
      default: 'FEFO',
    },
    lowStockThreshold: { type: Number, default: 5 },
    isShortcoming: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.virtual('totalQuantity').get(function () {
  return this.batches.reduce(
    (sum, batch) => sum + (batch.isActive ? batch.quantity : 0),
    0
  );
});

ProductSchema.pre('save', function (next) {
  this.isShortcoming = this.totalQuantity < this.lowStockThreshold;
  next();
});

// ============================================================
// 🔥 Full Egyptian Treatments Database
// ============================================================
const egyptMeds100 = [
  // NSAIDs & Painkillers
  { name: 'Panadol Extra', type: 'Tablets', company: 'GSK', details: 'Paracetamol + Caffeine', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Panadol Advance', type: 'Tablets', company: 'GSK', details: 'Paracetamol', sellingPrice: 22, purchasePrice: 18 },
  { name: 'Brufen 400mg', type: 'Tablets', company: 'Abbott', details: 'Ibuprofen', sellingPrice: 45, purchasePrice: 36 },
  { name: 'Brufen 600mg', type: 'Tablets', company: 'Abbott', details: 'Ibuprofen', sellingPrice: 55, purchasePrice: 44 },
  { name: 'Cataflam 50mg', type: 'Tablets', company: 'Novartis', details: 'Diclofenac Potassium', sellingPrice: 40, purchasePrice: 32 },
  { name: 'Voltaren 50mg', type: 'Tablets', company: 'Novartis', details: 'Diclofenac Sodium', sellingPrice: 45, purchasePrice: 36 },
  { name: 'Voltaren 75mg', type: 'Ampoules', company: 'Novartis', details: 'Diclofenac Sodium', sellingPrice: 30, purchasePrice: 24 },
  { name: 'Ketofan 50mg', type: 'Capsules', company: 'Amiriya', details: 'Ketoprofen', sellingPrice: 15, purchasePrice: 12 },
  { name: 'Ketolac', type: 'Ampoules', company: 'Amoun', details: 'Ketorolac', sellingPrice: 25, purchasePrice: 20 },
  { name: 'Novaldol', type: 'Tablets', company: 'Sanofi', details: 'Paracetamol 1000mg', sellingPrice: 30, purchasePrice: 24 },
  
  // Antibiotics
  { name: 'Augmentin 1g', type: 'Tablets', company: 'GSK', details: 'Amoxicillin + Clavulanic Acid', sellingPrice: 110, purchasePrice: 90 },
  { name: 'Augmentin 625mg', type: 'Tablets', company: 'GSK', details: 'Amoxicillin + Clavulanic Acid', sellingPrice: 85, purchasePrice: 68 },
  { name: 'Amoclan 1g', type: 'Tablets', company: 'Hikma', details: 'Amoxicillin + Clavulanic Acid', sellingPrice: 85, purchasePrice: 68 },
  { name: 'Hibiotic 1g', type: 'Tablets', company: 'Amoun', details: 'Amoxicillin + Clavulanic Acid', sellingPrice: 90, purchasePrice: 72 },
  { name: 'Zithromax 500mg', type: 'Tablets', company: 'Pfizer', details: 'Azithromycin', sellingPrice: 120, purchasePrice: 96 },
  { name: 'Xithrokan 500mg', type: 'Capsules', company: 'Amoun', details: 'Azithromycin', sellingPrice: 40, purchasePrice: 32 },
  { name: 'Ciprocin 500mg', type: 'Tablets', company: 'EIPICO', details: 'Ciprofloxacin', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Tavanic 500mg', type: 'Tablets', company: 'Sanofi', details: 'Levofloxacin', sellingPrice: 105, purchasePrice: 85 },
  { name: 'Suprax 400mg', type: 'Capsules', company: 'Hikma', details: 'Cefixime', sellingPrice: 95, purchasePrice: 76 },
  { name: 'Flumox 500mg', type: 'Capsules', company: 'EIPICO', details: 'Amoxicillin + Flucloxacillin', sellingPrice: 45, purchasePrice: 36 },

  // Cold & Flu
  { name: 'Congestal', type: 'Tablets', company: 'Sigma', details: 'Paracetamol + Chlorpheniramine + Pseudoephedrine', sellingPrice: 30, purchasePrice: 24 },
  { name: '1,2,3 (One Two Three)', type: 'Tablets', company: 'Hikma', details: 'Cold and Flu', sellingPrice: 18, purchasePrice: 14 },
  { name: 'Comtrex', type: 'Tablets', company: 'GSK', details: 'Cold and Flu Multi-Symptom', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Panadol Cold & Flu', type: 'Tablets', company: 'GSK', details: 'Cold and Flu', sellingPrice: 40, purchasePrice: 32 },
  { name: 'C-Retard 500mg', type: 'Capsules', company: 'Hikma', details: 'Vitamin C', sellingPrice: 25, purchasePrice: 20 },
  { name: 'Otrivin Adult 0.1%', type: 'Nasal Drops', company: 'GSK', details: 'Xylometazoline', sellingPrice: 20, purchasePrice: 16 },
  { name: 'Otrivin Baby Saline', type: 'Nasal Drops', company: 'GSK', details: 'Saline', sellingPrice: 15, purchasePrice: 12 },
  { name: 'Claritine', type: 'Tablets', company: 'Bayer', details: 'Loratadine', sellingPrice: 45, purchasePrice: 36 },
  { name: 'Zyrtec', type: 'Tablets', company: 'GSK', details: 'Cetirizine', sellingPrice: 50, purchasePrice: 40 },
  { name: 'Telfast 120mg', type: 'Tablets', company: 'Sanofi', details: 'Fexofenadine', sellingPrice: 65, purchasePrice: 52 },

  // Gastrointestinal & Digestion
  { name: 'Antinal', type: 'Capsules', company: 'Amoun', details: 'Nifuroxazide', sellingPrice: 25, purchasePrice: 20 },
  { name: 'Antinal', type: 'Suspension', company: 'Amoun', details: 'Nifuroxazide', sellingPrice: 15, purchasePrice: 12 },
  { name: 'Nexium 40mg', type: 'Tablets', company: 'AstraZeneca', details: 'Esomeprazole', sellingPrice: 95, purchasePrice: 78 },
  { name: 'Nexium 20mg', type: 'Tablets', company: 'AstraZeneca', details: 'Esomeprazole', sellingPrice: 70, purchasePrice: 58 },
  { name: 'Controloc 40mg', type: 'Tablets', company: 'Takeda', details: 'Pantoprazole', sellingPrice: 110, purchasePrice: 90 },
  { name: 'Spasmo-Digestin', type: 'Tablets', company: 'Pharco', details: 'Antispasmodic & Digestive Enzyme', sellingPrice: 22, purchasePrice: 18 },
  { name: 'Colona', type: 'Tablets', company: 'Rameda', details: 'Mebeverine + Sulpiride', sellingPrice: 40, purchasePrice: 32 },
  { name: 'Maalox Plus', type: 'Suspension', company: 'Sanofi', details: 'Antacid', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Gaviscon Advance', type: 'Suspension', company: 'Reckitt', details: 'Antacid', sellingPrice: 65, purchasePrice: 52 },
  { name: 'Motilium', type: 'Tablets', company: 'Janssen', details: 'Domperidone', sellingPrice: 30, purchasePrice: 24 },

  // Cardiovascular & Daily
  { name: 'Concor 5mg', type: 'Tablets', company: 'Amoun', details: 'Bisoprolol', sellingPrice: 55, purchasePrice: 45 },
  { name: 'Concor 10mg', type: 'Tablets', company: 'Amoun', details: 'Bisoprolol', sellingPrice: 70, purchasePrice: 58 },
  { name: 'Concor 5 Plus', type: 'Tablets', company: 'Amoun', details: 'Bisoprolol + Hydrochlorothiazide', sellingPrice: 65, purchasePrice: 52 },
  { name: 'Capoten 25mg', type: 'Tablets', company: 'GSK', details: 'Captopril', sellingPrice: 40, purchasePrice: 32 },
  { name: 'Aldactone 25mg', type: 'Tablets', company: 'Pfizer', details: 'Spironolactone', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Plavix 75mg', type: 'Tablets', company: 'Sanofi', details: 'Clopidogrel', sellingPrice: 250, purchasePrice: 210 },
  { name: 'Crestor 10mg', type: 'Tablets', company: 'AstraZeneca', details: 'Rosuvastatin', sellingPrice: 180, purchasePrice: 145 },
  { name: 'Lipitor 20mg', type: 'Tablets', company: 'Pfizer', details: 'Atorvastatin', sellingPrice: 140, purchasePrice: 115 },
  { name: 'Aspirin Protect 100mg', type: 'Tablets', company: 'Bayer', details: 'Acetylsalicylic Acid', sellingPrice: 25, purchasePrice: 20 },
  { name: 'Exforge 5/160mg', type: 'Tablets', company: 'Novartis', details: 'Amlodipine + Valsartan', sellingPrice: 160, purchasePrice: 130 },

  // Diabetes & Endocrine
  { name: 'Amaryl 3mg', type: 'Tablets', company: 'Sanofi', details: 'Glimepiride', sellingPrice: 50, purchasePrice: 40 },
  { name: 'Amaryl 2mg', type: 'Tablets', company: 'Sanofi', details: 'Glimepiride', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Glucophage 1000mg', type: 'Tablets', company: 'Minapharm', details: 'Metformin', sellingPrice: 60, purchasePrice: 48 },
  { name: 'Glucophage 500mg', type: 'Tablets', company: 'Minapharm', details: 'Metformin', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Galvus Met 50/1000mg', type: 'Tablets', company: 'Novartis', details: 'Vildagliptin + Metformin', sellingPrice: 190, purchasePrice: 155 },
  { name: 'Jardiance 10mg', type: 'Tablets', company: 'Boehringer', details: 'Empagliflozin', sellingPrice: 280, purchasePrice: 235 },
  { name: 'Diamicron MR 60mg', type: 'Tablets', company: 'Servier', details: 'Gliclazide', sellingPrice: 65, purchasePrice: 52 },
  { name: 'Lantus SoloStar', type: 'Injection Pen', company: 'Sanofi', details: 'Insulin Glargine', sellingPrice: 650, purchasePrice: 580 },
  { name: 'Mixtard 30 Penfill', type: 'Injection Pen', company: 'Novo Nordisk', details: 'Insulin Biphasic', sellingPrice: 180, purchasePrice: 150 },
  { name: 'Eltroxin 100mcg', type: 'Tablets', company: 'Aspen', details: 'Levothyroxine', sellingPrice: 85, purchasePrice: 70 },
  { name: 'Eltroxin 50mcg', type: 'Tablets', company: 'Aspen', details: 'Levothyroxine', sellingPrice: 55, purchasePrice: 45 },

  // Vitamins, Supplements & Blood
  { name: 'Centrum with Lutein', type: 'Tablets', company: 'Pfizer', details: 'Multivitamin', sellingPrice: 250, purchasePrice: 210 },
  { name: 'Neuroton', type: 'Ampoules', company: 'Amoun', details: 'Vitamin B Complex', sellingPrice: 45, purchasePrice: 36 },
  { name: 'Neuroton', type: 'Tablets', company: 'Amoun', details: 'Vitamin B Complex', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Feroglobin', type: 'Capsules', company: 'Vitabiotics', details: 'Iron + Zinc + B Complex', sellingPrice: 110, purchasePrice: 90 },
  { name: 'Limitless C-Zinc', type: 'Tablets', company: 'Limitless', details: 'Vitamin C + Zinc', sellingPrice: 150, purchasePrice: 120 },
  { name: 'Osteocare', type: 'Tablets', company: 'Vitabiotics', details: 'Calcium + Magnesium + Zinc', sellingPrice: 95, purchasePrice: 78 },
  { name: 'Cal-Mag', type: 'Tablets', company: 'Hapi', details: 'Calcium + Magnesium', sellingPrice: 60, purchasePrice: 48 },
  { name: 'Vidrop', type: 'Oral Drops', company: 'MUP', details: 'Vitamin D3 2800 IU/ml', sellingPrice: 20, purchasePrice: 16 },
  { name: 'Alpha Kadol', type: 'Ointment', company: 'Amoun', details: 'Chymotrypsin', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Alphintern', type: 'Tablets', company: 'Amoun', details: 'Anti-inflammatory enzymes', sellingPrice: 45, purchasePrice: 36 },

  // Respiratory & Cough
  { name: 'Prospan', type: 'Syrup', company: 'Engelhard', details: 'Ivy Leaf Extract', sellingPrice: 85, purchasePrice: 68 },
  { name: 'Oplex', type: 'Syrup', company: 'Amoun', details: 'Cough Suppressant', sellingPrice: 25, purchasePrice: 20 },
  { name: 'Sinecod', type: 'Syrup', company: 'GSK', details: 'Butamirate', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Bronchicum', type: 'Syrup', company: 'Sanofi', details: 'Herbal Cough Remedy', sellingPrice: 40, purchasePrice: 32 },
  { name: 'Ventolin', type: 'Inhaler', company: 'GSK', details: 'Salbutamol', sellingPrice: 60, purchasePrice: 48 },
  { name: 'Symbicort Turbuhaler', type: 'Inhaler', company: 'AstraZeneca', details: 'Budesonide + Formoterol', sellingPrice: 290, purchasePrice: 245 },
  { name: 'Farcolin', type: 'Solution for Inhalation', company: 'Pharco', details: 'Salbutamol', sellingPrice: 20, purchasePrice: 16 },
  { name: 'Mucosolvan', type: 'Syrup', company: 'Sanofi', details: 'Ambroxol', sellingPrice: 35, purchasePrice: 28 },
  { name: 'Bisolvon', type: 'Tablets', company: 'Sanofi', details: 'Bromhexine', sellingPrice: 25, purchasePrice: 20 },
  { name: 'Apidone', type: 'Syrup', company: 'Amoun', details: 'Dexamethasone + Chlorpheniramine', sellingPrice: 18, purchasePrice: 14 },

  // Ophthalmic & Ear (Drops)
  { name: 'TobraDex', type: 'Eye Drops', company: 'Alcon', details: 'Tobramycin + Dexamethasone', sellingPrice: 50, purchasePrice: 40 },
  { name: 'Systane Ultra', type: 'Eye Drops', company: 'Alcon', details: 'Lubricant Eye Drops', sellingPrice: 110, purchasePrice: 90 },
  { name: 'Refresh Tears', type: 'Eye Drops', company: 'Allergan', details: 'Lubricant Eye Drops', sellingPrice: 85, purchasePrice: 68 },
  { name: 'Vaxol', type: 'Ear Spray', company: 'Pharma', details: 'Olive Oil', sellingPrice: 90, purchasePrice: 72 },
  { name: 'Dewax', type: 'Ear Drops', company: 'Amoun', details: 'Wax Softener', sellingPrice: 15, purchasePrice: 12 },
  { name: 'Polyfresh', type: 'Eye Drops', company: 'Orchidia', details: 'Hyaluronic Acid', sellingPrice: 75, purchasePrice: 60 },
  { name: 'Optive', type: 'Eye Drops', company: 'Allergan', details: 'Dual Action Lubing', sellingPrice: 125, purchasePrice: 100 },
  { name: 'Dexatobrin', type: 'Eye Drops', company: 'EIPICO', details: 'Tobramycin + Dexamethasone', sellingPrice: 25, purchasePrice: 20 },
  { name: 'Blink Intensive Tears', type: 'Eye Drops', company: 'Abbott', details: 'Lubricant', sellingPrice: 135, purchasePrice: 110 },
  { name: 'Gatiflox', type: 'Eye Drops', company: 'Orchidia', details: 'Gatifloxacin', sellingPrice: 45, purchasePrice: 36 },

  // Dermatology & Topicals
  { name: 'Fucidin', type: 'Cream', company: 'LEO', details: 'Fusidic Acid', sellingPrice: 45, purchasePrice: 36 },
  { name: 'Fucicort', type: 'Cream', company: 'LEO', details: 'Fusidic Acid + Betamethasone', sellingPrice: 60, purchasePrice: 48 },
  { name: 'Kenacomb', type: 'Cream', company: 'GSK', details: 'Triamcinolone + Neomycin', sellingPrice: 40, purchasePrice: 32 },
  { name: 'Betaderm', type: 'Ointment', company: 'EIPICO', details: 'Betamethasone', sellingPrice: 20, purchasePrice: 16 },
  { name: 'Daktarin', type: 'Oral Gel', company: 'Janssen', details: 'Miconazole', sellingPrice: 45, purchasePrice: 36 },
  { name: 'Mebo', type: 'Ointment', company: 'Julphar', details: 'Burns and Wounds', sellingPrice: 75, purchasePrice: 60 },
  { name: 'Garamycin', type: 'Cream', company: 'Schering', details: 'Gentamicin', sellingPrice: 20, purchasePrice: 16 },
  { name: 'Bepanthen', type: 'Cream', company: 'Bayer', details: 'Dexpanthenol', sellingPrice: 90, purchasePrice: 72 },
  { name: 'Sudocrem', type: 'Cream', company: 'Actavis', details: 'Zinc Oxide', sellingPrice: 140, purchasePrice: 115 },
  { name: 'Elocon', type: 'Cream', company: 'MSD', details: 'Mometasone Furoate', sellingPrice: 50, purchasePrice: 40 }
];

async function seedEgyptMeds() {
  console.log('🔗 Connecting to MongoDB...');

  try {
    const conn = await mongoose
      .createConnection(MONGODB_URI, {
        bufferCommands: false,
        autoIndex: true,
      })
      .asPromise();

    const Product =
      conn.models.Product || conn.model('Product', ProductSchema);

    console.log('🗑️ Deleting ALL existing products...');
    await Product.deleteMany({});
    console.log('✅ Database cleared');

    let addedCount = 0;

    for (const med of egyptMeds100) {
      // ✅ Easy numeric barcode: 1,2,3,4...
      const uniqueBarcode = String(addedCount + 1);

      const entryBatch = {
        batchNumber: String(addedCount + 1),
        barcode: uniqueBarcode,
        quantity: Math.floor(Math.random() * 80) + 20,
        purchasePrice: med.purchasePrice,
        sellingPrice: med.sellingPrice,
        expiryDate: new Date(
          new Date().setFullYear(new Date().getFullYear() + 2)
        ),
        supplier: 'Egyptian United Pharma',
        isActive: true,
      };

      let unitOptions = ['علبة'];
      let unitConversion = 1;
      const typeLower = med.type.toLowerCase();

      if (typeLower.includes('tablet') || typeLower.includes('capsule')) {
        unitOptions = ['علبة', 'شريط', 'قرص'];
        unitConversion = 3;
      } else if (typeLower.includes('ampoule')) {
        unitOptions = ['علبة', 'امبول'];
        unitConversion = 5;
      }

      const product = new Product({
        name: med.name,
        type: med.type,
        unit: 'علبة',
        unitConversion,
        company: med.company,
        details: med.details,
        unitOptions,
        isBaseUnit: true,
        batches: [entryBatch],
        inventoryMethod: 'FEFO',
        lowStockThreshold: 15,
      });

      await product.save();
      addedCount++;

      console.log(
        `[${addedCount}] ✅ ${med.name} | Barcode: ${uniqueBarcode}`
      );
    }

    console.log(`\n🎉 Done! Added ${addedCount} products successfully`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error Seeding Data:', error);
    process.exit(1);
  }
}

seedEgyptMeds();
