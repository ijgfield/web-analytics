"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analytics_1 = require("./analytics");
const app = (0, express_1.default)();
const PORT = 3000;
app.get('/', (req, res) => {
    const analytics = new analytics_1.Analytics({
        projectId: '1234',
    });
    const track = analytics.track('click', undefined, {
        reason: 'hi',
        next: 'to',
    });
    res.send(track);
});
app.listen(PORT, () => {
    console.log('Server running on port: ', PORT);
});
