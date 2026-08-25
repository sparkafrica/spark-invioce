console.log("DATABASE_URL:", JSON.stringify(process.env.DATABASE_URL));
console.log("Length:", process.env.DATABASE_URL?.length);

// Try to parse it
const url = new URL(process.env.DATABASE_URL!);
console.log("Parsed URL:");
console.log("  protocol:", url.protocol);
console.log("  hostname:", url.hostname);
console.log("  port:", url.port);
console.log("  pathname:", url.pathname);
console.log("  username:", url.username);
console.log("  password:", url.password);