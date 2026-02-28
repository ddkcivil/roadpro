// seed-mock-project.cjs
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/roadpro';

const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  client: { type: String, required: true },
  location: String,
  mapOverlays: Array,
  structures: Array,
  landParcels: Array,
  vehicles: Array,
  staffLocations: Array,
  sitePhotos: Array,
  linearWorks: Array,
}, { timestamps: true, strict: false });

const Project = mongoose.model('Project', projectSchema);

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const projectName = 'Kathmandu Ring Road Expansion';
    const existing = await Project.findOne({ name: projectName });

    if (existing) {
      console.log('Mock project already exists.');
      process.exit(0);
    }

    // Alignment points (approximate for demonstration)
    const alignmentCoords = [
      { lat: 27.7172, lng: 85.3240 },
      { lat: 27.7200, lng: 85.3300 },
      { lat: 27.7250, lng: 85.3350 },
      { lat: 27.7300, lng: 85.3400 },
      { lat: 27.7350, lng: 85.3450 },
    ];

    const mockProject = new Project({
      id: 'proj-mock-001',
      name: projectName,
      code: 'KRR-EXP-01',
      client: 'Department of Roads, Nepal',
      location: '27.7172, 85.3240',
      startDate: '2025-01-01',
      endDate: '2027-12-31',
      mapOverlays: [
        {
          id: 'ov-001',
          name: 'Main Alignment (Centerline)',
          type: 'Alignment',
          coordinates: alignmentCoords,
          color: '#3b82f6',
          visible: true
        }
      ],
      structures: [
        {
          id: 'str-001',
          name: 'Pashupati Culvert',
          type: 'Box Culvert',
          location: '27.7180, 85.3260',
          coordinates: '27.7180, 85.3260',
          chainage: '0+200',
          status: 'In Progress',
          progress: 45
        },
        {
          id: 'str-002',
          name: 'Bagmati Bridge Abutment A',
          type: 'Abutment',
          location: '27.7220, 85.3320',
          coordinates: '27.7220, 85.3320',
          chainage: '0+850',
          status: 'Completed',
          progress: 100
        }
      ],
      landParcels: [
        {
          id: 'lp-001',
          parcelNumber: '782/A',
          area: 500,
          unit: 'sq.m',
          ownerName: 'Ram Bahadur',
          acquisitionStatus: 'Acquired',
          coordinates: [
            { lat: 27.7210, lng: 85.3310 },
            { lat: 27.7215, lng: 85.3315 },
            { lat: 27.7210, lng: 85.3320 },
            { lat: 27.7205, lng: 85.3315 }
          ]
        }
      ],
      vehicles: [
        {
          id: 'v-001',
          plateNumber: 'BA-2-CHA-1234',
          name: 'Excavator CAT-320',
          type: 'Excavator',
          driver: 'Hari Prasad',
          status: 'Active',
          gpsLocation: {
            latitude: 27.7190,
            longitude: 85.3280,
            speed: 5,
            timestamp: new Date().toISOString()
          }
        }
      ],
      staffLocations: [
        {
          id: 's-001',
          userId: 'u1',
          userName: 'Engineer Sharma',
          role: 'Site Engineer',
          latitude: 27.7240,
          longitude: 85.3340,
          status: 'Active',
          timestamp: new Date().toISOString()
        }
      ],
      linearWorks: [
        {
          id: 'lw-001',
          category: 'Earthwork',
          layer: 'Embankment',
          startChainage: 0.1,
          endChainage: 0.4,
          side: 'Both',
          status: 'Completed',
          date: '2025-02-20'
        },
        {
          id: 'lw-002',
          category: 'Pavement',
          layer: 'Sub-base',
          startChainage: 0.1,
          endChainage: 0.25,
          side: 'LHS',
          status: 'In Progress',
          date: '2025-02-25'
        }
      ],
      sitePhotos: [
        {
          id: 'ph-001',
          date: '2025-02-27',
          caption: 'Excavation at Pashupati segment',
          location: '27.7185, 85.3270',
          category: 'Earthwork',
          url: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&w=400&q=80',
          isAnalyzed: true
        }
      ]
    });

    await mockProject.save();
    console.log('-----------------------------------');
    console.log('Mock project created successfully!');
    console.log(`Name: ${projectName}`);
    console.log('-----------------------------------');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
