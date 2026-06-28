const fs = require('fs');

const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');

const targetModels = [
  'Student',
  'Route',
  'Vehicle',
  'VehicleStop',
  'VehicleStaff',
  'StudentTransportAssignment',
  'TransportDetail',
  'TransportStop',
  'TransportAssignment',
  'TransportCollection'
];

targetModels.forEach(modelName => {
  const regex = new RegExp(`model\\s+${modelName}\\s+\\{([^\\}]+)\\}`, 'g');
  const match = regex.exec(schemaContent);
  if (match) {
    console.log(`==================== MODEL: ${modelName} ====================`);
    console.log(match[0]);
    console.log('\n');
  } else {
    console.log(`==================== MODEL: ${modelName} (NOT FOUND) ====================`);
  }
});
