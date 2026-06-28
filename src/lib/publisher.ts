export async function publishVehicleLocation(
  vehicleId: string,
  data: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    sequenceNo: number | null;
    timestamp: string;
  }
) {
  console.log(`📡 [PUBLISHER] Broadcast vehicle location: ${vehicleId}`, data);
}
export default publishVehicleLocation;
