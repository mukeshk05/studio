
'use server';
/**
 * @fileOverview A schedulable Genkit flow to check prices for tracked items.
 *
 * This flow is designed to be triggered periodically by a scheduler (e.g., a cron job).
 * It iterates through all users, checks their tracked flights and hotels, calls SerpApi
 * to get the latest prices, and sends notifications if the price drops below the user's target.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getUsers, getTrackedItemsForUser, updateTrackedItemInFirestore } from '@/lib/firestoreServer';
import { getRealFlightsAction, getRealHotelsAction } from '@/app/actions/data';
import { sendEmailNotification, sendPushNotification } from '@/lib/notificationService';
import { format, addMonths, parseISO, isValid, isFuture } from 'date-fns';

// Helper function to parse dates and check if they are in the future
function isDateInFuture(dateString?: string): boolean {
    if (!dateString) return true; // If no date, assume it's trackable
    try {
        // Handle simple date formats like "2024-08-15"
        const date = parseISO(dateString.split(' ')[0]);
        if (isValid(date)) {
            return isFuture(date);
        }
        // Handle descriptive dates by doing a very basic check
        if (dateString.toLowerCase().includes("next") || dateString.toLowerCase().includes("for")) {
            return true;
        }
    } catch (e) {
        console.warn(`Could not parse date string: ${dateString}. Assuming it's in the future.`);
        return true;
    }
    return true; // Default to true to avoid missing potential deals
}

// Define the input and output schemas for the flow (optional, but good practice)
const PriceCheckSchedulerInputSchema = z.object({}).optional();
const PriceCheckSchedulerOutputSchema = z.object({
  processedUsers: z.number(),
  processedItems: z.number(),
  notificationsSent: z.number(),
  errors: z.number(),
});

export const scheduledPriceCheckFlow = ai.defineFlow(
  {
    name: 'scheduledPriceCheckFlow',
    inputSchema: PriceCheckSchedulerInputSchema,
    outputSchema: PriceCheckSchedulerOutputSchema,
  },
  async () => {
    console.log('[SchedulerFlow] Starting scheduled price check...');
    let processedUsers = 0;
    let processedItems = 0;
    let notificationsSent = 0;
    let errorCount = 0;

    const users = await getUsers();
    if (users.length === 0) {
      console.log('[SchedulerFlow] No users found to process.');
      return { processedUsers, processedItems, notificationsSent, errors: errorCount };
    }

    for (const user of users) {
      try {
        const trackedItems = await getTrackedItemsForUser(user.id);
        const futureItems = trackedItems.filter(item => isDateInFuture(item.travelDates));
        
        console.log(`[SchedulerFlow] User ${user.id}: Found ${futureItems.length} future-dated items to check.`);

        for (const item of futureItems) {
          processedItems++;
          let latestPrice: number | undefined;
          let foundItemName: string = item.itemName;

          // Default dates for API calls if not specified
          const defaultDeparture = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
          const defaultReturn = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

          try {
            if (item.itemType === 'flight' && item.originCity && item.destination) {
              const flightResults = await getRealFlightsAction({
                origin: item.originCity,
                destination: item.destination,
                departureDate: item.travelDates || defaultDeparture, // Simplified date handling
              });
              const potentialFlight = (flightResults.best_flights || []).concat(flightResults.other_flights || [])[0];
              if (potentialFlight?.price) {
                latestPrice = potentialFlight.price;
                foundItemName = `${potentialFlight.airline || item.itemName} to ${item.destination}`;
              }
            } else if (item.itemType === 'hotel' && item.destination) {
              const hotelResults = await getRealHotelsAction({
                destination: item.destination,
                checkInDate: item.travelDates || defaultDeparture,
                checkOutDate: defaultReturn, // Needs better logic for hotel stay duration
              });
              const potentialHotel = hotelResults.hotels?.[0];
              if (potentialHotel?.price_per_night) {
                latestPrice = potentialHotel.price_per_night;
                foundItemName = potentialHotel.name || item.itemName;
              }
            }

            if (latestPrice !== undefined) {
              console.log(`[SchedulerFlow] Item ${item.id}: Current Price $${item.currentPrice}, New Price $${latestPrice}, Target $${item.targetPrice}`);

              const hasDroppedEnough = latestPrice <= item.targetPrice;
              const alertStatus = {
                shouldAlert: hasDroppedEnough,
                alertMessage: hasDroppedEnough
                  ? `Price for ${foundItemName} has dropped to $${latestPrice}!`
                  : `Price for ${foundItemName} is currently $${latestPrice}.`,
              };

              await updateTrackedItemInFirestore(user.id, item.id, {
                currentPrice: latestPrice,
                lastChecked: new Date().toISOString(),
                alertStatus,
              });

              if (alertStatus.shouldAlert && user.email) {
                notificationsSent++;
                const subject = `Price Drop Alert for ${foundItemName}`;
                const body = `<h2>Great news!</h2><p>The price for your tracked item, <strong>${foundItemName}</strong>, has dropped to <strong>$${latestPrice}</strong>, which meets your target of $${item.targetPrice}.</p><p>Consider booking it soon!</p>`;
                
                // Send notifications (simulated)
                await sendPushNotification(user.id, subject, `The price is now $${latestPrice}!`);
                await sendEmailNotification(user.email, subject, body);
              }
            }
          } catch (itemError) {
            console.error(`[SchedulerFlow] Error processing item ${item.id} for user ${user.id}:`, itemError);
            errorCount++;
          }
        }
        processedUsers++;
      } catch (userError) {
        console.error(`[SchedulerFlow] Error processing user ${user.id}:`, userError);
        errorCount++;
      }
    }

    console.log(`[SchedulerFlow] Finished. Processed ${processedUsers} users, ${processedItems} items. Sent ${notificationsSent} notifications. Encountered ${errorCount} errors.`);
    return { processedUsers, processedItems, notificationsSent, errors: errorCount };
  }
);
