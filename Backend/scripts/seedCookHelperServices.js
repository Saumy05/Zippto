const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const UserService = require('../models/UserService');
const { SERVICE_STATUS } = require('../utils/constants');

dotenv.config();

/**
 * Seed Cook & Home Helper categories (one-time bookings only, no daily/monthly plans).
 * Structure: Category -> Brand (service group) -> UserService (bookable item).
 *
 * Additive and idempotent: existing records (matched by slug / title) are never overwritten or
 * deleted; for existing categories/brands only an empty image field is filled in, so images
 * uploaded from the admin panel are kept. Prices are starting values; admin can edit them from
 * the panel. Empty cityIds = available in every city.
 *
 * Images are real photographs served from Frontend/public/cat_images/<slug>.jpg (same folder and path style
 * as the other category images).
 */
const imagePath = (slug) => `/cat_images/${slug}.jpg`;

const seedData = [
  {
    category: {
      title: 'Cook',
      slug: 'cook',
      description: 'Experienced cooks for a one-time meal, guests or a party at your home',
      homeOrder: 11,
      isPopular: true
    },
    brands: [
      {
        title: 'Home Cook',
        slug: 'cook-home-cook',
        badge: 'POPULAR',
        isPopular: true,
        services: [
          { title: 'Veg Meal Cook (up to 4 people)', basePrice: 499, description: 'One-time cook for a veg meal, about 2 hours, up to 4 people' },
          { title: 'Non-Veg Meal Cook (up to 4 people)', basePrice: 599, description: 'One-time cook for a non-veg meal, about 2 hours, up to 4 people' },
          { title: 'Veg Meal Cook (5 to 8 people)', basePrice: 749, description: 'One-time cook for a veg meal, about 3 hours, 5 to 8 people' },
          { title: 'Non-Veg Meal Cook (5 to 8 people)', basePrice: 899, description: 'One-time cook for a non-veg meal, about 3 hours, 5 to 8 people' }
        ]
      },
      {
        title: 'Party & Event Cook',
        slug: 'cook-party-event-cook',
        badge: null,
        isPopular: true,
        services: [
          { title: 'Party Cook (up to 10 guests)', basePrice: 1499, description: 'Cook for a house party, about 4 hours, up to 10 guests' },
          { title: 'Party Cook (11 to 25 guests)', basePrice: 2999, description: 'Cook for a house party, about 6 hours, 11 to 25 guests' },
          { title: 'Birthday / Get-together Cook', basePrice: 1999, description: 'Cook for birthdays and family get-togethers, about 5 hours' }
        ]
      },
      {
        title: 'Festival & Pooja Cooking',
        slug: 'cook-festival-pooja-cooking',
        badge: null,
        isPopular: false,
        services: [
          { title: 'Pooja Bhog / Prasad Cooking', basePrice: 799, description: 'Pure veg bhog and prasad preparation, about 3 hours' },
          { title: 'Festival Special Meal Cook', basePrice: 1299, description: 'Festival thali preparation for the family, about 4 hours' }
        ]
      }
    ]
  },
  {
    category: {
      title: 'Home Helper',
      slug: 'home-helper',
      description: 'Trusted helpers for kitchen work, household chores, care and party support on a one-time basis',
      homeOrder: 12,
      isPopular: true
    },
    brands: [
      {
        title: 'Kitchen Helper',
        slug: 'helper-kitchen-helper',
        badge: null,
        isPopular: true,
        services: [
          { title: 'Utensil Washing', basePrice: 249, description: 'One-time utensil and dish washing, about 1 hour' },
          { title: 'Cooking Assistant', basePrice: 349, description: 'Chopping, grinding and kitchen prep help, about 2 hours' },
          { title: 'Kitchen Clean-up', basePrice: 399, description: 'Platform, stove and sink cleaning with utensil washing, about 2 hours' }
        ]
      },
      {
        title: 'House Help',
        slug: 'helper-house-help',
        badge: 'POPULAR',
        isPopular: true,
        services: [
          { title: 'Sweeping & Mopping (up to 2 BHK)', basePrice: 299, description: 'One-time sweeping and mopping, about 1.5 hours' },
          { title: 'Dusting & Home Tidy-up', basePrice: 349, description: 'Dusting, arranging and tidying rooms, about 2 hours' },
          { title: 'Clothes Washing & Drying', basePrice: 299, description: 'Hand wash and dry a load of clothes, about 1.5 hours' }
        ]
      },
      {
        title: 'Care Helper',
        slug: 'helper-care-helper',
        badge: null,
        isPopular: false,
        services: [
          { title: 'Elderly Care Attendant (4 hours)', basePrice: 599, description: 'Companion and assistance for elders, 4 hours' },
          { title: 'Child Care / Babysitter (4 hours)', basePrice: 549, description: 'Supervised child care at home, 4 hours' }
        ]
      },
      {
        title: 'Party Helper',
        slug: 'helper-party-helper',
        badge: null,
        isPopular: false,
        services: [
          { title: 'Party Serving & Clean-up (4 hours)', basePrice: 699, description: 'Serving food, handling utensils and clean-up during and after a party, 4 hours' }
        ]
      }
    ]
  }
];

const seedCookHelperServices = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const stats = { categories: 0, brands: 0, services: 0, skipped: 0 };

    for (const group of seedData) {
      let category = await Category.findOne({ slug: group.category.slug });
      if (category) {
        console.log(`⏭️  Category "${category.title}" already exists, skipping create`);
        stats.skipped++;
        if (!category.homeIconUrl || !category.imageUrl || category.homeIconUrl.endsWith('.svg') || category.imageUrl.endsWith('.svg')) {
          category.homeIconUrl = imagePath(group.category.slug);
          category.imageUrl = imagePath(group.category.slug);
          await category.save();
          console.log('   🖼️  Updated category image to real JPG');
        }
      } else {
        category = await Category.create({
          ...group.category,
          homeIconUrl: imagePath(group.category.slug),
          imageUrl: imagePath(group.category.slug),
          homeBadge: null,
          hasSaleBadge: false,
          showOnHome: true,
          status: SERVICE_STATUS.ACTIVE,
          visitingCharges: 0, // fixed-price one-time services, no inspection fee
          cityIds: []
        });
        console.log(`✅ Created category: ${category.title}`);
        stats.categories++;
      }

      for (const brandData of group.brands) {
        const { services, ...brandFields } = brandData;

        let brand = await Brand.findOne({ slug: brandFields.slug });
        if (brand) {
          console.log(`  ⏭️  Brand "${brand.title}" already exists, skipping create`);
          stats.skipped++;
          if (!brand.iconUrl || brand.iconUrl.endsWith('.svg')) {
            brand.iconUrl = imagePath(brandFields.slug);
            await brand.save();
            console.log('     🖼️  Updated brand image to real JPG');
          }
        } else {
          brand = await Brand.create({
            ...brandFields,
            iconUrl: imagePath(brandFields.slug),
            categoryId: category._id,
            categoryIds: [category._id],
            cityIds: [],
            status: SERVICE_STATUS.ACTIVE
          });
          console.log(`  ✅ Created brand: ${brand.title}`);
          stats.brands++;
        }

        for (const svc of services) {
          const exists = await UserService.findOne({ brandId: brand._id, title: svc.title });
          if (exists) {
            stats.skipped++;
            continue;
          }
          await UserService.create({
            ...svc,
            brandId: brand._id,
            categoryId: category._id,
            gstPercentage: 18,
            status: SERVICE_STATUS.ACTIVE
          });
          console.log(`      ✅ ${svc.title} - ₹${svc.basePrice}`);
          stats.services++;
        }
      }
    }

    console.log(
      `\n🎉 Done. Created: ${stats.categories} categories, ${stats.brands} brands, ` +
      `${stats.services} services. Skipped existing: ${stats.skipped}`
    );
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  seedCookHelperServices();
}

module.exports = { seedCookHelperServices };
