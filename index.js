require("dotenv").config();
const cookie = process.env.COOKIE;
const pet_base_url = process.env.PETBASEURL;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");

mongoose.connect(
    "mongodb+srv://stl:stl@cluster0-p8kcd.mongodb.net/savethislife?authSource=admin&replicaSet=Cluster0-shard-0&readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=true",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);
mongoose.set("useFindAndModify", false);
const PetImportSchema = require("./models/pet.model");
const OwnerImportSchema = require("./models/owner.model");
const PhotoImportSchema = require("./models/photo.model");
const connection = mongoose.connection;
connection.once("open", function () {
    console.log("MongoDB Database connection established Successfully.");

    for (let thread = 1; thread < max_thread_num + 1; thread++) {
        start_pet_import(thread);
    }
});

const debug = require("./log");
const max_thread_num = 30;
const max_pet_id = 1100000;

async function start_pet_import(thread) {
    await debug.log(thread, "starting thread " + thread);

    for (let index = thread; index < max_pet_id; index += max_thread_num) {
        const process = index;

        try {
            await debug.log(thread, "sending request to page " + process);
            const result = await axios.get(pet_base_url + process, {
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    Cookie: cookie,
                },
            });
            await debug.log(thread, "received data from page " + process);

            const $ = cheerio.load(result.data);
            const data = {
                microchip: $(
                    "#pet-form > div > .panel-body > div:nth-child(2) > .panel-body > div:nth-child(3) > span"
                ).text(),
                registered_at: $(
                    "#pet-form > div > .panel-body > div:nth-child(2) > .panel-body > div:nth-child(5) > span"
                ).text(),

                petName: $("#petname").attr("value"),
                petSpecies: $("select[name='species'] option:selected").attr(
                    "value"
                ),
                petBreed: $("#breed").attr("value"),
                petColor: $("input[name='color']").attr("value"),
                petGender: $("select[name='gender'] option:selected").attr(
                    "value"
                ),
                petBirth: $("input[name='birthdate']").attr("value"),

                specialNeeds: $("textarea[name='needs']").text(),
                vetInfo: $("textarea[name='veterinary']").text(),
                dateRV: $("input[name='datevacc']").attr("value"),
                implantedCompany: $("input[name='purchasedfrom']").attr(
                    "value"
                ),
                email: $("input[name='owneremail']").attr("value"),
                membership: "platinum",

                ownerName: $("input[name='ownername']").attr("value"),
                ownerPhone1: $("input[name='cellphone']").attr("value"),
                ownerPhone2: $("input[name='secondphone']").attr("value"),
                ownerPhone3: $("input[name='addphone0']").attr("value"),
                ownerPhone4: $("input[name='addphone1']").attr("value"),
                ownerPhone5: $("input[name='addphone2']").attr("value"),
                ownerPhone6: $("input[name='addphone3']").attr("value"),
                ownerPhone7: $("input[name='addphone4']").attr("value"),
                ownerAddress1: $("input[name='address']").attr("value"),
                ownerAddress2: "",
                ownerCity: $("input[name='city']").attr("value"),
                ownerState: $("input[name='state']").attr("value"),
                ownerZip: $("input[name='zipcode']").attr("value"),
                ownerCountry: $("select[name='country'] option:selected").attr(
                    "value"
                ),
                ownerSecContact: $("input[name='secondcontact']").attr("value"),
                ownerNote: "",

                petMicrochip: $(
                    "#pet-form > div > .panel-body > div:nth-child(2) > .panel-body > div:nth-child(3) > span"
                ).text(),
                petPhotoName: $("img.image-pet").attr("src"),
                petPhotoData: $("img.image-pet").attr("src"),
            };
            if ($(".container > div > .panel-warning").length !== 0)
                data.membership = "diamond";
            if (data.petSpecies === "") data.petSpecies = "Dog";
            if (data.petGender === "") data.petGender = "Male";
            if (data.ownerCountry === "") data.ownerCountry = "US";

            const petImport = new PetImportSchema(data);
            const ownerImport = new OwnerImportSchema(data);
            const photoImport = new PhotoImportSchema(data);

            if (data.microchip !== "") {
                await PetImportSchema.findOneAndUpdate(
                    { microchip: data.microchip },
                    data,
                    async function (err, pet) {
                        if (err)
                            await debug.log(
                                thread,
                                err + " :: on page " + process
                            );
                        if (!pet) {
                            try {
                                await petImport.save();
                                await debug.log(
                                    thread,
                                    "saved new pet from page " + process
                                );
                            } catch (error) {
                                await debug.log(
                                    thread,
                                    error + " :: on page " + process
                                );
                            }
                        } else {
                            await debug.log(
                                thread,
                                "updated new pet from page " + process
                            );
                        }
                    }
                );
            }

            if (data.email !== "") {
                await OwnerImportSchema.findOneAndUpdate(
                    { email: data.email },
                    data,
                    async function (err, owner) {
                        if (err)
                            await debug.log(
                                thread,
                                err + " :: on page " + process
                            );
                        if (!owner) {
                            try {
                                await ownerImport.save();
                                await debug.log(
                                    thread,
                                    "saved new owner from page " + process
                                );
                            } catch (error) {
                                await debug.log(
                                    thread,
                                    error + " :: on page " + process
                                );
                            }
                        } else {
                            await debug.log(
                                thread,
                                "updated new owner from page " + process
                            );
                        }
                    }
                );
            }

            if (data.petPhotoData !== "") {
                await PhotoImportSchema.findOneAndUpdate(
                    { petMicrochip: data.petMicrochip },
                    data,
                    async function (err, photo) {
                        if (err)
                            await debug.log(
                                thread,
                                err + " :: on page " + process
                            );
                        if (!photo) {
                            try {
                                await photoImport.save();
                                await debug.log(
                                    thread,
                                    "saved new photo from page " + process
                                );
                            } catch (error) {
                                await debug.log(
                                    thread,
                                    error + " :: on page " + process
                                );
                            }
                        } else {
                            await debug.log(
                                thread,
                                "updated new photo from page " + process
                            );
                        }
                    }
                );
            }
        } catch (error) {
            await debug.log(thread, error + " :: on page " + process);
        }
    }
}
