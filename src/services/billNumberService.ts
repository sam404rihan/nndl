import { supabase } from '@/lib/supabase';

/**
 * Generates the next bill number in format BN{YY}{LETTER}{XXX}
 * Example: BN26A001, BN26A002, ..., BN26A999, BN26B001, ..., BN26Z999, BN26AA001
 * Resets every financial year (April 1st)
 */
export async function generateBillNumber(): Promise<string> {
  // Determine financial year (April to March)
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();
  
  let year_suffix: string;
  if (currentMonth >= 4) {
    // April onwards, use current year
    year_suffix = currentYear.toString().slice(-2);
  } else {
    // Jan-Mar, use previous year
    year_suffix = (currentYear - 1).toString().slice(-2);
  }
  
  const fy = `FY${year_suffix}`;

  // Get or create sequence for this financial year
  const { data: sequence, error: fetchError } = await supabase
    .from('number_sequences')
    .select('*')
    .eq('sequence_type', 'bill')
    .eq('financial_year', fy)
    .single();

  let currentLetter: string;
  let currentNumber: number;

  if (fetchError && fetchError.code === 'PGRST116') {
    // No sequence exists, create first one
    const { data: newSeq, error: insertError } = await supabase
      .from('number_sequences')
      .insert({
        sequence_type: 'bill',
        financial_year: fy,
        current_letter: 'A',
        current_number: 1
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to create bill sequence: ${insertError.message}`);
    
    currentLetter = 'A';
    currentNumber = 1;
  } else if (fetchError) {
    throw new Error(`Failed to fetch bill sequence: ${fetchError.message}`);
  } else {
    // Sequence exists, increment it
    let nextNumber = sequence.current_number + 1;
    let nextLetter = sequence.current_letter;

    if (nextNumber > 999) {
      // Roll over to next letter
      nextNumber = 1;
      nextLetter = incrementLetter(sequence.current_letter);
    }

    // Update the sequence
    const { error: updateError } = await supabase
      .from('number_sequences')
      .update({
        current_letter: nextLetter,
        current_number: nextNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', sequence.id);

    if (updateError) throw new Error(`Failed to update bill sequence: ${updateError.message}`);

    currentLetter = nextLetter;
    currentNumber = nextNumber;
  }

  // Generate bill number: BN + YY + LETTER + XXX
  const billNo = `BN${year_suffix}${currentLetter}${currentNumber.toString().padStart(3, '0')}`;

  // Update last_generated
  await supabase
    .from('number_sequences')
    .update({ last_generated: billNo })
    .eq('sequence_type', 'bill')
    .eq('financial_year', fy);

  return billNo;
}

/**
 * Increments letter: A→B...Z→AA→AB...AZ→BA...ZZ→A
 */
function incrementLetter(letter: string): string {
  // Single letter: A-Z
  if (letter.length === 1) {
    if (letter === 'Z') {
      return 'AA';
    } else {
      return String.fromCharCode(letter.charCodeAt(0) + 1);
    }
  }
  // Double letter: AA-ZZ
  else {
    const firstChar = letter[0];
    const secondChar = letter[1];
    
    // Second letter A-Y, increment it
    if (secondChar < 'Z') {
      return firstChar + String.fromCharCode(secondChar.charCodeAt(0) + 1);
    }
    // Second letter is Z, increment first letter
    else if (firstChar < 'Z') {
      return String.fromCharCode(firstChar.charCodeAt(0) + 1) + 'A';
    }
    // ZZ reached, wrap to A
    else {
      return 'A';
    }
  }
}
