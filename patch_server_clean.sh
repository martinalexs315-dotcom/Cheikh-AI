# Remove the call to startServer() at the bottom
sed -i 's/startServer();//g' server.ts

# Ensure startServer() is called when the file is run directly (not imported)
echo '
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}' >> server.ts
