import { NextResponse } from 'next/server';

const contacts = {
    nour: "201557835159",
    ali: "201146971208", // Developer
    yousef: "201102749778"
};

export async function GET(request, { params }) {
    const name = params.name?.toLowerCase();
    const contactNumber = contacts[name];

    if (contactNumber) {
        return NextResponse.redirect(`https://wa.me/${contactNumber}`);
    }

    return NextResponse.json(
        { error: "Contact not found", available_contacts: Object.keys(contacts) },
        { status: 404 }
    );
}
