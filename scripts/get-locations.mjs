import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://avxabvwlnumzogqnwaat.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eGFidndsbnVtem9ncW53YWF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTIwODM1MiwiZXhwIjoyMTA0Nzg0MzUyfQ.kxA5blaECFLDy7U3Wv9Xq8s2VEgWpYQB9YWUT8TDjB0'
);

const ids = [
  '0a96e4d7-4093-4c0d-8774-c5e6ff014d7e',
  '9a6d8548-9c8d-4010-8cc1-6252c7bbdc45',
  'cee12138-952b-412d-ad7b-681b5efdcaf4',
  '4aa7cd41-d414-466c-9a7c-ea1a7ccbc38c',
  '9583e313-4ee6-44d6-b2c9-d0453d20f3b2',
  '47d3a50c-96d7-4993-8ba2-56e6c8b8c131',
];

const { data } = await supabase
  .from('properties')
  .select('id, title, location')
  .in('id', ids);

console.log(JSON.stringify(data, null, 2));
