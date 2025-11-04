function formatGoogleSheetData(csvString: string) {
    const rows = csvString.split('\n')
    const headerShortNames = rows[0].split(',').map(header => header.trim())
    const headerLabels = rows[1].split(',').map(header => header.trim())

    const data = rows.slice(2).map(row => {
        const values = row.split(',').map((value, index) => index !== headerShortNames.indexOf('geoid') ? value.trim() : value.trim().toLowerCase())
        
        return headerShortNames.reduce((acc: Record<string, string>, header: string, index: number) => {
            acc[header] = values[index]
            return acc
        }, {} as Record<string, string>)
    })

    return {
        headerLabels,
        headerShortNames,
        data
    }
}

export { formatGoogleSheetData }