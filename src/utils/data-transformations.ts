function formatGoogleSheetData(csvString: string) {
    const rows = csvString.split('\n')
    const shortNameRowIdx = rows.findIndex(row => !row.split(',').includes(' ') && row.split(',').includes('geoid'))
    const headerShortNames = rows[shortNameRowIdx].split(',').map(header => header.trim())
    const labelRowIdx = 1 - shortNameRowIdx; //If shortNameRowIdx is 0, then labelRowIdx is 1, if shortNameRowIdx is 1, then labelRowIdx is 0
    const headerLabels = rows[labelRowIdx].split(',').map(header => header.trim())

    const data = rows.slice(2).map(row => {
        const values = row
        .split(',')
        .map((value, index) => index !== headerShortNames.indexOf('geoid') ? value.trim() : value.trim().toLowerCase())
        .map((value: string) => !isNaN(Number(value)) && value.includes('.') ? Number(value).toFixed(2) : value)
        
       // console.log(values)
        return headerShortNames.reduce((acc: Record<string, string>, header: string, index: number) => {
            acc[header] = values[index]
            return acc
        }, {} as Record<string, string>)
    })
    //IPUMS data has extra zeros in the geoid, we need to remove them
    data.forEach(row => {
       if(row.geoid && (row.geoid.includes('005700') || row.geoid.includes('002300'))) {
        row.geoid = row.geoid.replace('G','').replace('g','').replace('005700', '0570').replace('002300', '0230')
       }
       //Some data should be percentages but is not formatted correctly
       Object.keys(row).forEach(key => {
        if(!key.includes('Count_') && row[key] && !isNaN(Number(row[key])) && Number(row[key])>0&&Number(row[key])<1) {
            row[key] = (Number(row[key])*100).toString()
        }
       })
    })
    console.log(data)
    return {
        headerLabels,
        headerShortNames,
        data
    }
}

export { formatGoogleSheetData } 