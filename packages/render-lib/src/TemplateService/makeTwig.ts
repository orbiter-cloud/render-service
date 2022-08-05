import core from 'twig/src/twig.core.js'
import compiler from 'twig/src/twig.compiler.js'
import expression from 'twig/src/twig.expression.js'
import filters from 'twig/src/twig.filters.js'
import functions from 'twig/src/twig.functions.js'
import lib from 'twig/src/twig.lib.js'
// import core from 'twig/src/twig.loader.ajax.js'
import loader from 'twig/src/twig.loader.fs.js'
import logic from 'twig/src/twig.logic.js'
import parserSource from 'twig/src/twig.parser.source.js'
import parserTwig from 'twig/src/twig.parser.twig.js'
import path from 'twig/src/twig.path.js'
import tests from 'twig/src/twig.tests.js'
import asyncTwig from 'twig/src/twig.async.js'
import exportsTwig from 'twig/src/twig.exports.js'

export const makeTwig = ({filters: customFilters}: { filters }) => {
    const Twig = {
        VERSION: '1.14.0',
    }

    core(Twig)
    compiler(Twig)
    expression(Twig)
    filters(Twig)
    functions(Twig)
    lib(Twig)
    loader(Twig)
    logic(Twig)
    parserSource(Twig)
    parserTwig(Twig)
    path(Twig)
    tests(Twig)
    asyncTwig(Twig)
    exportsTwig(Twig)
    // Twig.exports.factory = factory
    customFilters.forEach((filter) => {
        // @ts-ignore
        Twig.exports.extendFilter(filter.name, filter.func)
    })

    return Twig
}
