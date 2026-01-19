/// <reference path="../pb_data/types.d.ts" />

onRecordCreate((e) => {
    e.next(); // Proceed with the creation

    // After successful creation
    const record = e.record;
    const promptId = record.get('prompt');

    try {
        // In newer PB versions, we might need to use e.app or $app
        const app = e.app || $app; 
        const prompt = app.findRecordById("prompts", promptId);
        
        // Increment likes_count
        prompt.set("likes_count", prompt.getInt("likes_count") + 1);
        
        app.save(prompt);
    } catch (err) {
        // e.app.logger().error(...) is better, but console.log works
        console.log("Failed to increment likes_count: " + err);
    }
}, "likes");

onRecordDelete((e) => {
    // We need to get info before delete, or ensure record is still accessible in event?
    // e.record is available.
    const record = e.record;
    const promptId = record.get('prompt');

    e.next(); // Proceed with delete

    // After successful delete
    try {
        const app = e.app || $app;
        const prompt = app.findRecordById("prompts", promptId);
        
        // Decrement likes_count
        const current = prompt.getInt("likes_count");
        if (current > 0) {
            prompt.set("likes_count", current - 1);
            app.save(prompt);
        }
    } catch (err) {
        console.log("Failed to decrement likes_count: " + err);
    }
}, "likes");