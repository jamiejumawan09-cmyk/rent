import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://avxabvwlnumzogqnwaat.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eGFidndsbnVtem9ncW53YWF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTIwODM1MiwiZXhwIjoyMTA0Nzg0MzUyfQ.kxA5blaECFLDy7U3Wv9Xq8s2VEgWpYQB9YWUT8TDjB0'
);

// Geocode each location using Nominatim
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Philippines')}&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'homerent-app/1.0' } });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

const properties = [
  { id: '0a96e4d7-4093-4c0d-8774-c5e6ff014d7e', location: 'Bacolod City' },
  { id: '9a6d8548-9c8d-4010-8cc1-6252c7bbdc45', location: 'Toledo, Cebu City' },
  { id: 'cee12138-952b-412d-ad7b-681b5efdcaf4', location: 'Mambaling, Cebu City' },
  { id: '9583e313-4ee6-44d6-b2c9-d0453d20f3b2', location: 'Bogo City, Cebu' },
  { id: '4aa7cd41-d414-466c-9a7c-ea1a7ccbc38c', location: 'Iloilo City' },
  { id: '47d3a50c-96d7-4993-8ba2-56e6c8b8c131', location: 'Bantayan Island, Cebu' },
];

for (const p of properties) {
  const coords = await geocode(p.location);
  if (!coords) { console.log(`❌ Could not geocode: ${p.location}`); continue; }

  const { error } = await supabase
    .from('properties')
    .update({ latitude: coords.lat, longitude: coords.lng })
    .eq('id', p.id);

  if (error) {
    console.log(`❌ DB error for ${p.location}: ${error.message}`);
  } else {
    console.log(`✅ ${p.location} → ${coords.lat}, ${coords.lng}`);
  }

  // Nominatim rate limit: 1 request/second
  await new Promise(r => setTimeout(r, 1100));
}

console.log('\nDone! All 6 properties now have coordinates.');
