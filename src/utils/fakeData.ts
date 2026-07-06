
// Utility to generate fake purchase data for advertising toasts

// Ghanaian cities and towns
const locations = [
  "Accra", "Kumasi", "Tamale", "Cape Coast", "Takoradi", "Ho", "Koforidua", 
  "Sunyani", "Bolgatanga", "Wa", "Techiman", "Tema", "Obuasi", "Teshie",
  "Madina", "Nsawam", "Winneba", "Elmina", "Kasoa", "Ejura", "Mampong",
  "Akim Oda", "Suhum", "Wenchi", "Axim", "Konongo", "Nkawkaw", "Kintampo"
];

// Ghanaian first names
const firstNames = [
  "Kofi", "Ama", "Kwame", "Akosua", "Yaw", "Afua", "Kwesi", "Abena", 
  "Kwabena", "Adwoa", "Emmanuel", "Gifty", "Samuel", "Patience", "Isaac", 
  "Mercy", "Daniel", "Grace", "Michael", "Victoria", "John", "Elizabeth",
  "David", "Sarah", "Joseph", "Doris", "Richard", "Abigail", "Prince", "Esther"
];

// Ghanaian last names
const lastNames = [
  "Mensah", "Osei", "Owusu", "Boateng", "Asante", "Adjei", "Addo", "Agyemang",
  "Amoako", "Poku", "Abebrese", "Danso", "Appiah", "Boadu", "Darko", "Frimpong",
  "Gyasi", "Kusi", "Manu", "Nkansah", "Ntim", "Ofori", "Opoku", "Sarpong",
  "Takyi", "Wiredu", "Yeboah", "Ansah", "Badu", "Asamoah"
];

// Generate a random integer between min and max (inclusive)
const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Get a random element from an array
const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Generate purchase notification data
export const generatePurchaseNotification = () => {
  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const location = getRandomElement(locations);
  
  // Determine voucher type with a 60/40 split between WASSCE and BECE
  const voucherType = Math.random() < 0.6 ? "WASSCE" : "BECE";
  
  // Usually small quantities (1-5), occasionally medium (6-10), rarely large (11-20)
  let quantity = 1;
  const randomValue = Math.random();
  if (randomValue < 0.7) {
    // 70% chance of 1-5 vouchers
    quantity = getRandomInt(1, 5);
  } else if (randomValue < 0.95) {
    // 25% chance of 6-10 vouchers
    quantity = getRandomInt(6, 10);
  } else {
    // 5% chance of 11-20 vouchers
    quantity = getRandomInt(11, 20);
  }

  return {
    name: `${firstName} ${lastName}`,
    location,
    voucherType,
    quantity
  };
};
